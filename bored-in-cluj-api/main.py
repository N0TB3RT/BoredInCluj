from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import strawberry
from strawberry.fastapi import GraphQLRouter
from typing import List
from datetime import datetime
from nosql import chat_collection, chat_helper
from audit import log_user_action
from models import User
import json
import os
import shutil

from schema import Query, Mutation
from database import get_db, SessionLocal

# Ensure persistent storage structures exist on local disk
os.makedirs("static/quests", exist_ok=True)
os.makedirs("static/events", exist_ok=True)

# Context Generator: Injects the database session into GraphQL context
async def get_context(request: Request):
    return {"db": SessionLocal(),
    "request": request
    }

schema = strawberry.Schema(query=Query, mutation=Mutation)
graphql_app = GraphQLRouter(
    schema,
    context_getter=get_context
)

app = FastAPI()

origins = [
    "http://localhost:5173",       # Local React development
    "https://localhost:5173",      # Local Secure React
    # "http://YOUR_DROPLET_IP",    # We will uncomment and add this later!
     "https://boredincluj.me"     # Your future domain!
]

# Mount Static File System to make images visible via public URLs
app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Universal Upload REST API Endpoint for Quests and Events
@app.post("/api/upload-media/{category}")
async def upload_media(category: str, file: UploadFile = File(...)):
    if category not in ["quests", "events"]:
        raise HTTPException(status_code=400, detail="Invalid target category layout.")

    # Standardize path routing
    file_path = f"static/{category}/{file.filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"imageUrl": f"http://localhost:8000/{file_path}"}

# --- THE WEBSOCKET MANAGER ---
class ConnectionManager:
    def __init__(self):
        # Keeps track of all active user connections
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        # Send the message to every single connected user instantly
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/chat")
async def websocket_chat_endpoint(websocket: WebSocket):
    await manager.connect(websocket)

    try:
        # 1. Fetch history with explicit error catching
        try:
            cursor = chat_collection.find().sort("timestamp", -1).limit(50)
            history = await cursor.to_list(length=50)
        except Exception as db_err:
            print(f"CRITICAL MONGODB ERROR: {db_err}")
            return # Abort if DB fails

        history.reverse()
        history_batch = [chat_helper(msg) for msg in history]

        # Send the entire list in one single WebSocket blast
        await websocket.send_text(json.dumps({
            "type": "HISTORY_BATCH",
            "payload": history_batch
        }))

        # 2. Listen for incoming new messages
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            author_username = message_data.get("authorUsername")

            # --- THE GATEKEEPER: Check PostgreSQL for active timeouts BEFORE saving ---
            db = SessionLocal()
            try:
                user = db.query(User).filter(User.username == author_username).first()
                if user:
                    # Check for permanent ban
                    if user.is_banned:
                        await websocket.send_text(json.dumps({
                            "type": "NEW_MESSAGE",
                            "payload": {
                                "id": "sys",
                                "author": "SYSTEM",
                                "content": "ACCOUNT BANNED. CONTACT ADMIN.",
                                "timestamp": datetime.utcnow().isoformat()
                            }
                        }))
                        continue # Skip saving and jump to the next message

                    # Check for temporary timeout
                    if user.timeout_until and user.timeout_until > datetime.utcnow():
                        remaining = (user.timeout_until - datetime.utcnow()).seconds // 60
                        await websocket.send_text(json.dumps({
                            "type": "NEW_MESSAGE",
                            "payload": {
                                "id": "sys",
                                "author": "SYSTEM",
                                "content": f"COMMUNICATIONS MUTED. ({remaining}m remaining)",
                                "timestamp": datetime.utcnow().isoformat()
                            }
                        }))
                        continue # Skip saving and jump to the next message
            finally:
                db.close() # Close the gatekeeper session

            # --- IF APPROVED: Build and save the message ---
            new_message = {
                "type": message_data.get("type", "GENERAL"),
                "content": message_data["content"],
                "author": author_username,
                "timestamp": datetime.utcnow().isoformat()
            }

            # Save to MongoDB
            await chat_collection.insert_one(new_message)

            # --- GOLD CHALLENGE: Log the successful action to PostgreSQL ---
            db_audit = SessionLocal()
            try:
                action_text = "Broadcasted LFG Squad" if new_message["type"] == "LFG" else "Transmitted City Comms Signal"
                log_user_action(db_audit, author_username, action_text)
            finally:
                db_audit.close()

            # Clean the ID and broadcast to all users!
            broadcast_payload = chat_helper(new_message)
            await manager.broadcast(json.dumps({"type": "NEW_MESSAGE", "payload": broadcast_payload}))

    except WebSocketDisconnect:
        manager.disconnect(websocket)


# Mount the GraphQL endpoint
app.include_router(graphql_app, prefix="/graphql")