import motor.motor_asyncio
import certifi
from datetime import datetime

# Paste your exact MongoDB Atlas connection string here.
# REMEMBER: Replace <password> with your actual database user password!
MONGO_DETAILS = "mongodb+srv://admin:Cluj2026@cluster0.kizm5wd.mongodb.net/?appName=Cluster0"

# certifi.where() provides the secure SSL certificates so Windows doesn't block the cloud connection
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_DETAILS, tlsCAFile=certifi.where())

# This will automatically create a database named "bored_in_cluj" in your Atlas cluster
database = client.bored_in_cluj

# The collection where we will store the chat history
chat_collection = database.get_collection("city_comms")

# Helper to format the MongoDB document ID safely for React
def chat_helper(message) -> dict:
    return {
        "id": str(message["_id"]),
        "type": message.get("type", "GENERAL"),
        "content": message["content"],
        "author": message["author"],
        "timestamp": message["timestamp"],
    }