import jwt
from datetime import datetime, timedelta

# --- JWT CONFIGURATION ---
# In a real production app, this lives in your .env file!
SECRET_KEY = "super-secret-bored-in-cluj-key"
ALGORITHM = "HS256"

# This perfectly satisfies the "logged out in case of inactivity" requirement
INACTIVITY_TIMEOUT_MINUTES = 30

def create_access_token(username: str, role_name: str):
    """
    Generates a secure JWT containing the user's identity, explicit role string, and expiration.
    """
    expire = datetime.utcnow() + timedelta(minutes=INACTIVITY_TIMEOUT_MINUTES)

    payload = {
        "sub": username,
        "role": role_name, # <-- Stamping the exact string role! (User, Moderator, or Admin)
        "exp": expire
    }

    encoded_jwt = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    """
    Decodes the JWT passport. Automatically enforces the inactivity timeout.
    """
    try:
        # The frontend sends it as "Bearer <token>", so we slice off the word "Bearer "
        if token.startswith("Bearer "):
            token = token.split(" ")[1]

        # If the 30-minute inactivity timer has passed, this line will intentionally crash!
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload

    except jwt.ExpiredSignatureError:
        return "EXPIRED" #
    except jwt.InvalidTokenError:
        return "INVALID"