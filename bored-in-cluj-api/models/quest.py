# models/quest.py
from pydantic import BaseModel, Field
from typing import Optional

class Location(BaseModel):
    name: str = Field(..., min_length=1, description="Location name is required")
    lat: float
    lng: float

class QuestCreate(BaseModel):
    title: str = Field(..., min_length=5, description="Title must be at least 5 characters.")
    type: str = Field(..., description="Quest category (e.g., Exploration, Food)")
    description: str = Field(..., min_length=15, description="Description must be at least 15 characters.")
    difficulty: int = Field(..., ge=1, le=5, description="Difficulty must be between 1 and 5.")
    xpReward: int = Field(..., gt=0, le=1000, description="XP must be between 1 and 1000.")
    location: Location
    status: str = "Active"

class QuestResponse(QuestCreate):
    id: str