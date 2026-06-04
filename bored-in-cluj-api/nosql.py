import motor.motor_asyncio
import certifi
import os
from dotenv import load_dotenv

# Load the hidden .env file safely
load_dotenv()

# Read the connection string from memory
MONGO_DETAILS = os.getenv("MONGO_URI")

# Secure connection using certifi for SSL
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_DETAILS, tlsCAFile=certifi.where())
database = client.bored_in_cluj
chat_collection = database.get_collection("city_comms")

def chat_helper(message) -> dict:
    return {
        "id": str(message["_id"]),
        "type": message.get("type", "GENERAL"),
        "content": message["content"],
        "author": message["author"],
        "timestamp": message["timestamp"],
    }