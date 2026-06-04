from database import SessionLocal
from models import User, Role

def assign_role(target_username: str, role_name: str):
    db = SessionLocal()
    try:
        # 1. Find your account in the database
        user = db.query(User).filter(User.username == target_username).first()
        if not user:
            print(f"❌ ERROR: Could not find user '{target_username}' in the grid.")
            return

        # 2. Find the exact Role object
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            print(f"❌ ERROR: Role '{role_name}' does not exist. Make sure you've logged in at least once to trigger the seed function!")
            return

        # 3. Update your security clearance
        user.roles.clear() # Shred old passports
        user.roles.append(role) # Grant the new clearance
        db.commit()

        print(f"🛡️ SUCCESS: User '{target_username}' has been granted {role_name} clearance!")

    finally:
        db.close()

if __name__ == "__main__":
    # You can change "Moderator" to "Admin" or "User" to test different locks!
    assign_role("admin", "Admin")