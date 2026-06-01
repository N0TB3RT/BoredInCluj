# routers/quests.py
from fastapi import APIRouter, HTTPException, Query
from typing import List
from models.quest import QuestCreate, QuestResponse
from database import fake_db
import time

router = APIRouter(
    prefix="/api/quests",
    tags=["Quests"]
)

@router.post("/", response_model=QuestResponse, status_code=201)
async def create_quest(quest: QuestCreate):
    # Generate a simple sequential ID like we did on the frontend
    max_id_num = 100
    if fake_db["quests"]:
        max_id_num = max([int(q["id"].split("_")[1]) for q in fake_db["quests"] if "_" in q["id"]])

    new_quest = quest.model_dump()
    new_quest["id"] = f"q_{max_id_num + 1}"

    fake_db["quests"].insert(0, new_quest) # Add to top
    return new_quest

@router.get("/", response_model=List[QuestResponse])
async def get_quests(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(5, ge=1, le=50, description="Items per page")
):
    # Server-side pagination implementation
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit

    # Slice the RAM list to return only the requested page
    return fake_db["quests"][start_idx:end_idx]

# Add this right below your GET route for pagination

@router.get("/stats/")
async def get_quest_statistics():
    """Returns basic statistics about the current quests in RAM."""
    total_quests = len(fake_db["quests"])
    if total_quests == 0:
        return {"total": 0, "average_difficulty": 0, "average_xp": 0}

    avg_diff = sum(q["difficulty"] for q in fake_db["quests"]) / total_quests
    avg_xp = sum(q["xpReward"] for q in fake_db["quests"]) / total_quests

    return {
        "total": total_quests,
        "average_difficulty": round(avg_diff, 2),
        "average_xp": round(avg_xp, 2)
    }

@router.put("/{quest_id}", response_model=QuestResponse)
async def update_quest(quest_id: str, quest: QuestCreate):
    """The 'U' in CRUD. Overwrites an existing quest with new data."""
    for i, q in enumerate(fake_db["quests"]):
        if q["id"] == quest_id:
            updated_quest = quest.model_dump()
            updated_quest["id"] = quest_id # Preserve the original ID
            fake_db["quests"][i] = updated_quest
            return updated_quest

    raise HTTPException(status_code=404, detail="Quest not found")

@router.delete("/{quest_id}", status_code=204)
async def delete_quest(quest_id: str):
    for i, q in enumerate(fake_db["quests"]):
        if q["id"] == quest_id:
            del fake_db["quests"][i]
            return
    raise HTTPException(status_code=404, detail="Quest not found")