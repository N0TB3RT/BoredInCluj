import asyncio
import json
import random
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from faker import Faker
from database import fake_db  # Assuming you have your RAM database here

router = APIRouter(prefix="/api/simulation", tags=["Simulation"])
fake = Faker()

# Global state for the simulation loop and connected clients
simulation_task = None
connected_clients: List[WebSocket] = []

# BoredInCluj specific fake data pools
CLUJ_LOCATIONS = [
    {"name": "Piata Unirii", "lat": 46.769, "lng": 23.589},
    {"name": "Central Park", "lat": 46.769, "lng": 23.580},
    {"name": "Cetatuia Hill", "lat": 46.776, "lng": 23.581},
    {"name": "Botanical Garden", "lat": 46.756, "lng": 23.587},
    {"name": "Iulius Mall", "lat": 46.771, "lng": 23.626}
]
QUEST_TYPES = ["Exploration", "Food", "Puzzle", "Athletics", "Classified"]

async def fake_data_generator_loop():
    """The asynchronous loop that generates data and broadcasts it."""
    try:
        while True:
            await asyncio.sleep(3) # Generate a new quest every 3 seconds

            max_id = 100
            for q in fake_db["quests"]:
                try:
                    # Extract the number from "q_105"
                    current_num = int(q["id"].split("_")[1])
                    if current_num > max_id:
                        max_id = current_num
                except (IndexError, ValueError):
                    pass # Ignore if the ID format is weird

            new_consecutive_id = f"q_{max_id + 1}"

            # Generate fake but valid entity
            location = random.choice(CLUJ_LOCATIONS)
            new_quest = {
                "id": new_consecutive_id, # Use the consecutive ID here!
                "title": fake.catch_phrase().title(),
                "type": random.choice(QUEST_TYPES),
                "author": fake.user_name(),
                "description": fake.paragraph(nb_sentences=2),
                "difficulty": random.randint(1, 5),
                "cost": random.choice(["None", "Cheap", "Expensive"]),
                "xpReward": random.randint(10, 100) * 10,
                "status": "Active",
                "location": location,
                "conditions": {"daytime": ["ANY"], "weather": ["ANY"], "season": ["ANY"]}
            }

            # 1. Add to the server-side collection (RAM DB)
            fake_db["quests"].insert(0, new_quest)

            # 2. Alert the client via WebSockets
            if connected_clients:
                message = json.dumps({"type": "NEW_QUEST", "payload": new_quest})
                for client in connected_clients:
                    await client.send_text(message)

    except asyncio.CancelledError:
        print("Simulation loop stopped gracefully.")
@router.post("/start")
async def start_simulation():
    global simulation_task
    if simulation_task is None or simulation_task.done():
        # Fire and forget the async loop
        simulation_task = asyncio.create_task(fake_data_generator_loop())
        return {"message": "Simulation started."}
    return {"message": "Simulation is already running."}

@router.post("/stop")
async def stop_simulation():
    global simulation_task
    if simulation_task and not simulation_task.done():
        simulation_task.cancel() # Kills the loop
        return {"message": "Simulation stopped."}
    return {"message": "Simulation is not running."}

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    try:
        while True:
            # We just keep the connection open to listen for client disconnects
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        connected_clients.remove(websocket)