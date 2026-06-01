import uuid
import sys
from datetime import timedelta, datetime # Moved datetime import to the top for cleanliness
from sqlalchemy.orm import Session
from models import ActionLog, User, ObservationList

def log_user_action(db: Session, username: str, action_information: str):
    """
    Core auditing function. Formats logs as:
    USER ID : GROUP_ID (Admin/User) : ACTION_INFORMATION : TIMESTAMP
    """
    user = db.query(User).filter(User.username == username).first()

    if not user:
        print(f"\n🛡️ SECURITY WARNING: Attempted to log action for unknown user '{username}'\n", file=sys.stderr, flush=True)
        return

    group_id = user.roles[0].name if user.roles else "User"

    audit_entry = ActionLog(
        id=str(uuid.uuid4()),
        user_id=str(user.id),
        group_id=group_id,
        action_information=action_information
    )

    db.add(audit_entry)
    db.commit()

    print(f"\n🛡️ SECURITY: [ {user.id} : {group_id} : {action_information} ]\n", flush=True)

    # --- GOLD CHALLENGE PHASE 3: THREAT DETECTION ALGORITHM ---

    user_role = user.roles[0].name if user.roles else "User"

    if user_role == "Admin":
        return

    recent_actions = db.query(ActionLog).filter(
        ActionLog.user_id == str(user.id)
    ).order_by(ActionLog.timestamp.desc()).limit(5).all()

    if len(recent_actions) == 5:
        # FIX: Everything below this line is now properly indented!
        time_diff = recent_actions[0].timestamp - recent_actions[4].timestamp

        if time_diff <= timedelta(seconds=10):
            existing_flag = db.query(ObservationList).filter(
                ObservationList.user_id == str(user.id)
            ).first()

            if not existing_flag:
                # 1. Log them to the Observation List
                threat_entry = ObservationList(
                    id=str(uuid.uuid4()),
                    user_id=str(user.id),
                    reason="Automated Flag: System Abuse/Spam (5+ actions in under 10s)."
                )
                db.add(threat_entry)

                # 2. AUTO-TIMEOUT: Lock them out for 15 minutes
                user.timeout_until = datetime.utcnow() + timedelta(minutes=15)

                db.commit()
                print(f"\n🚨 THREAT DETECTED: User '{username}' timed out for 15 minutes!\n", flush=True)