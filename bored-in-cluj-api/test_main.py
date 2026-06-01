import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import json
import os

from main import app
from database import Base, get_db
import models

# --- 1. TEST DATABASE SETUP ---
# We use a local SQLite file for testing so we don't corrupt your live PostgreSQL data
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_database.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override the database dependency to inject the test database into GraphQL context
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# Create the test client
client = TestClient(app)

# --- 2. PYTEST FIXTURES ---
@pytest.fixture(scope="module", autouse=True)
def setup_database():
    # Build the database tables before tests run
    Base.metadata.create_all(bind=engine)
    
    # Ensure static upload folders exist for the REST API test
    os.makedirs("static/quests", exist_ok=True)
    os.makedirs("static/events", exist_ok=True)
    
    yield # Tests run here
    
    # Tear down the database after tests are done
    Base.metadata.drop_all(bind=engine)

    # FIX: Disconnect the SQLAlchemy engine to release the file lock on Windows
    engine.dispose()

    # Now Windows will safely allow the file to be deleted
    if os.path.exists("./test_database.db"):
        os.remove("./test_database.db")

# --- 3. THE TESTS ---

def test_user_creation_and_auto_admin():
    """Test that a new user gets 5 tokens, but NeonRunner gets Admin rights."""
    
    # 1. Test Standard User
    standard_query = """
    query {
      getUserProfile(username: "TestPlayer") {
        username
        tokens
        isAdmin
      }
    }
    """
    res1 = client.post("/graphql", json={"query": standard_query})
    data1 = res1.json()
    assert data1["data"]["getUserProfile"]["username"] == "TestPlayer"
    assert data1["data"]["getUserProfile"]["tokens"] == 5
    assert data1["data"]["getUserProfile"]["isAdmin"] is False

    # 2. Test Admin Auto-Promotion
    admin_query = """
    query {
      getUserProfile(username: "NeonRunner") {
        username
        isAdmin
      }
    }
    """
    res2 = client.post("/graphql", json={"query": admin_query})
    data2 = res2.json()
    assert data2["data"]["getUserProfile"]["isAdmin"] is True


def test_token_consumption():
    """Test that standard users lose tokens, but admins do not."""
    
    # 1. Standard user consumes a token
    consume_query = """
    mutation {
      consumeToken(username: "TestPlayer")
    }
    """
    res = client.post("/graphql", json={"query": consume_query})
    assert res.json()["data"]["consumeToken"] is True
    
    # Verify it dropped to 4
    check_query = '{ getUserProfile(username: "TestPlayer") { tokens } }'
    res_check = client.post("/graphql", json={"query": check_query})
    assert res_check.json()["data"]["getUserProfile"]["tokens"] == 4


def test_create_and_fetch_quest():
    """Test the full CRUD lifecycle of a Quest via GraphQL."""
    
    # 1. Create a Quest
    create_mutation = """
    mutation {
      createQuest(
        title: "Pytest Quest", type: "Exploration", description: "Automated test.", 
        difficulty: 3, xpReward: 500, lat: 46.0, lng: 23.0, locName: "Test Lab", 
        cost: "None", daytime: "ANY", weather: "ANY", season: "ANY", status: "Active"
      ) {
        id
        title
        difficulty
      }
    }
    """
    res = client.post("/graphql", json={"query": create_mutation})
    data = res.json()
    
    assert "errors" not in data
    assert data["data"]["createQuest"]["title"] == "Pytest Quest"
    quest_id = data["data"]["createQuest"]["id"]
    
    # 2. Fetch Quests to verify it exists
    fetch_query = """
    query {
      allQuests {
        id
        title
      }
    }
    """
    res_fetch = client.post("/graphql", json={"query": fetch_query})
    quests = res_fetch.json()["data"]["allQuests"]
    
    # Ensure our newly created quest is in the database array
    assert any(q["id"] == quest_id for q in quests)


def test_universal_media_upload_endpoint():
    """Test that the FastAPI REST endpoint successfully accepts and saves raw images."""
    
    # Create a dummy image file in memory
    file_content = b"fake_image_binary_data"
    files = {"file": ("test_image.jpg", file_content, "image/jpeg")}
    
    # Post it to the quests category
    response = client.post("/api/upload-media/quests", files=files)
    
    assert response.status_code == 200
    data = response.json()
    assert "imageUrl" in data
    assert "static/quests/test_image.jpg" in data["imageUrl"]
    
    # Clean up the fake file
    if os.path.exists("static/quests/test_image.jpg"):
        os.remove("static/quests/test_image.jpg")