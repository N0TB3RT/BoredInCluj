from __future__ import annotations
import strawberry
from strawberry.types import Info
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from graphql import GraphQLError
import uuid
import models
from audit import log_user_action
from security import create_access_token, verify_token
import typing
from strawberry.permission import BasePermission
from mailer import send_system_email
import random

class IsAdminGuard(BasePermission):
    message = "ACCESS DENIED: Admin clearance required."

    def has_permission(self, source: typing.Any, info: Info, **kwargs) -> bool:
        request = info.context.get("request")
        if not request:
            return False

        auth_header = request.headers.get("authorization")
        if not auth_header:
            self.message = "ACCESS DENIED: No security passport provided."
            return False

        payload = verify_token(auth_header)

        if payload == "EXPIRED":
            self.message = "SESSION TIMEOUT: You have been logged out due to inactivity."
            return False
        if payload == "INVALID":
            self.message = "ACCESS DENIED: Forged or invalid passport."
            return False

        # Enforce the FULLSTACK Admin Role
        if payload.get("role") != "Admin":
            self.message = "ACCESS DENIED: You lack the required permissions to execute this command."
            return False

        return True


class IsModeratorGuard(BasePermission):
    message = "ACCESS DENIED: Moderator clearance required."

    def has_permission(self, source: typing.Any, info: Info, **kwargs) -> bool:
        request = info.context.get("request")
        if not request: return False

        auth_header = request.headers.get("authorization")
        if not auth_header:
            self.message = "ACCESS DENIED: No security passport provided."
            return False

        payload = verify_token(auth_header)
        if payload == "EXPIRED":
            self.message = "SESSION TIMEOUT: You have been logged out due to inactivity."
            return False
        if payload == "INVALID":
            self.message = "ACCESS DENIED: Forged or invalid passport."
            return False

        # --- THE HIERARCHY CHECK ---
        # Both Moderators and full Admins are allowed to execute forum moderation commands
        user_role = payload.get("role")
        if user_role not in ["Moderator", "Admin"]:
            self.message = "ACCESS DENIED: You lack Moderator privileges."
            return False

        return True

@strawberry.type
class Location:
    name: str
    lat: float
    lng: float

@strawberry.type
class Conditions:
    daytime: List[str]
    weather: List[str]
    season: List[str]

@strawberry.type
class Quest:
    id: str
    title: str
    type: str
    description: str
    difficulty: int
    xpReward: int
    backgroundImage: Optional[str]
    location: Location
    conditions: Conditions
    author: str
    cost: str
    status: str

@strawberry.type
class Author:
    username: str
    email: Optional[str] = None
    avatar: str
    level: int
    rank: str
    tokens: int
    isAdmin: bool
    completedQuests: List[Quest]
    attendedEvents: List['EventType']
    access_token: str | None = None

@strawberry.type
class EventType:
    id: str
    title: str
    description: str
    dateTime: str
    location: str
    imageUrl: Optional[str]
    host: Optional[Author]
    attendees: List[Author]

@strawberry.type
class Comment:
    id: str
    author: str
    text: str
    timestamp: str

@strawberry.type
class Post:
    id: str
    type: str
    content: str
    timestamp: str
    likes: int
    author: Author
    commentsList: List[Comment]

@strawberry.type
class ForumStats:
    total_posts: int
    total_comments: int

@strawberry.type
class ObservationLog:
    id: str
    userId: str
    reason: str
    timestamp: str
    isReviewed: bool

def seed_rbac(db):
    """Ensures the core role hierarchy exists in the database."""
    admin_role = db.query(models.Role).filter(models.Role.name == "Admin").first()
    mod_role = db.query(models.Role).filter(models.Role.name == "Moderator").first()
    user_role = db.query(models.Role).filter(models.Role.name == "User").first()

    if not admin_role:
        admin_role = models.Role(id=f"r_{uuid.uuid4().hex[:8]}", name="Admin")
        mod_role = models.Role(id=f"r_{uuid.uuid4().hex[:8]}", name="Moderator")
        user_role = models.Role(id=f"r_{uuid.uuid4().hex[:8]}", name="User")

        db.add_all([admin_role, mod_role, user_role])
        db.commit()

    return admin_role, mod_role, user_role

@strawberry.type
class Query:
    @strawberry.field
    def all_quests(self, info: Info) -> List[Quest]:
        db = info.context["db"]
        db_quests = db.query(models.Quest).all()

        quest_objects = []
        for q in db_quests:
            loc = Location(name=q.loc_name or "Unknown", lat=q.loc_lat or 0.0, lng=q.loc_lng or 0.0)
            conds = Conditions(
                daytime=[getattr(q, 'daytime', None) or "ANY"],
                weather=[getattr(q, 'weather', None) or "ANY"],
                season=[getattr(q, 'season', None) or "ANY"]
            )
            quest_objects.append(Quest(
                id=q.id,
                title=q.title or "Untitled",
                type=getattr(q, 'type', None) or "Exploration",
                description=q.description or "",
                difficulty=getattr(q, 'difficulty', None) or 3,
                xpReward=q.xp_reward or 0,
                backgroundImage=q.image_url,
                location=loc,
                conditions=conds,
                author=getattr(q, 'author', None) or "System",
                cost=getattr(q, 'cost', None) or "None",
                status=getattr(q, 'status', None) or "Active"
            ))
        return quest_objects

    @strawberry.field
    def all_posts(self, info: Info, limit: int = 5, offset: int = 0) -> List[Post]:
        db = info.context["db"]
        db_posts = db.query(models.Post).order_by(models.Post.timestamp.desc()).offset(offset).limit(limit).all()

        post_objects = []
        for p in db_posts:
            # Check the role dynamically
            is_admin_check = (p.author.roles[0].name == "Admin") if p.author and p.author.roles else False

            author_obj = Author(
                username=p.author.username if p.author else "System",
                email=p.author.email if p.author else None,
                avatar=p.author.avatar if p.author else "Runner1",
                level=p.author.level if p.author else 1,
                rank=p.author.rank if p.author else "Rookie",
                tokens=p.author.tokens if p.author else 0,
                isAdmin=is_admin_check,
                completedQuests=[], attendedEvents=[]
            )

            comment_objects = []
            for c in p.comments_list:
                c_author_name = c.author.username if c.author else "Unknown"
                comment_objects.append(Comment(id=c.id, author=c_author_name, text=c.text, timestamp=c.timestamp))

            post_objects.append(Post(id=p.id, type=p.type, content=p.content, timestamp=p.timestamp, likes=p.likes, author=author_obj, commentsList=comment_objects))
        return post_objects

    @strawberry.field
    def all_events(self, info: Info) -> List[EventType]:
        db = info.context["db"]
        db_events = db.query(models.Event).all()

        event_objects = []
        for e in db_events:
            host_is_admin = (e.host.roles[0].name == "Admin") if e.host and e.host.roles else False

            host_obj = Author(
                username=e.host.username, email=e.host.email, avatar=e.host.avatar,
                level=e.host.level, rank=e.host.rank, tokens=e.host.tokens,
                isAdmin=host_is_admin, completedQuests=[], attendedEvents=[]
            ) if e.host else None

            attendees_list = [Author(
                username=a.username, email=a.email, avatar=a.avatar,
                level=a.level, rank=a.rank, tokens=a.tokens,
                isAdmin=(a.roles[0].name == "Admin" if a.roles else False),
                completedQuests=[], attendedEvents=[]
            ) for a in e.attendees]

            event_objects.append(EventType(id=e.id, title=e.title, description=e.description, dateTime=e.date_time, location=e.location, imageUrl=e.image_url, host=host_obj, attendees=attendees_list))
        return event_objects

    @strawberry.field
    def get_user_profile(self, info: Info, username: str) -> Author:
            db = info.context["db"]
            user = get_or_create_user(db, username)

            completed_quests = []
            for q in user.completed_quests:
                loc = Location(name=q.loc_name or "Unknown", lat=q.loc_lat or 0.0, lng=q.loc_lng or 0.0)
                conds = Conditions(
                    daytime=[getattr(q, 'daytime', None) or "ANY"],
                    weather=[getattr(q, 'weather', None) or "ANY"],
                    season=[getattr(q, 'season', None) or "ANY"]
                )
                completed_quests.append(Quest(
                    id=q.id, title=q.title or "Untitled", type=getattr(q, 'type', None) or "Exploration",
                    description=q.description or "", difficulty=getattr(q, 'difficulty', None) or 3,
                    xpReward=q.xp_reward or 0, backgroundImage=q.image_url, location=loc, conditions=conds,
                    author=getattr(q, 'author', None) or "System", cost=getattr(q, 'cost', None) or "None",
                    status=getattr(q, 'status', None) or "Active"
                ))

            user_role_name = user.roles[0].name if user.roles else "User"

            # BULLETPROOF RETURN: Safely checks for nulls before handing data to GraphQL
            return Author(
                username=user.username,
                email=user.email,
                avatar=user.avatar,
                level=user.level,
                rank=user.rank,
                tokens=user.tokens if user.tokens is not None else 5,
                isAdmin=(user_role_name == "Admin"),
                completedQuests=completed_quests,
                attendedEvents=[]
            )

    @strawberry.field
    def forum_statistics(self, info: Info) -> ForumStats:
        db = info.context["db"]
        total_posts = db.query(models.Post).count()
        total_comments = db.query(models.Comment).count()
        return ForumStats(total_posts=total_posts, total_comments=total_comments)

    @strawberry.field
    def get_observation_logs(self, info: Info) -> list[ObservationLog]:
        db = info.context["db"]

        # Fetch all flagged threats from PostgreSQL, newest first
        logs = db.query(models.ObservationList).order_by(models.ObservationList.timestamp.desc()).all()

        # Package the raw database rows into our GraphQL ObservationLog type
        return [
            ObservationLog(
                id=log.id,
                userId=log.user_id,
                reason=log.reason,
                timestamp=log.timestamp.isoformat(),
                isReviewed=log.is_reviewed
            )
            for log in logs
        ]

def get_or_create_user(db, username: str) -> models.User:
    # Always ensure roles exist first
    admin_role, mod_role, user_role = seed_rbac(db)

    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        user = models.User(id=f"u_{uuid.uuid4().hex[:8]}", username=username, avatar="Runner1", level=1, rank="Rookie", tokens=5)

        # Assign the correct DB Role Object
        if username in ["NeonRunner", "Admin"]:
            user.roles.append(admin_role)
        else:
            user.roles.append(user_role)

        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Failsafe for your existing testing:
        needs_update = False

        if username in ["NeonRunner", "Admin"] and not any(r.name == "Admin" for r in user.roles):
            user.roles.append(admin_role) # Map the database role
            needs_update = True

        if user.tokens is None:
            user.tokens = 5
            needs_update = True

        if needs_update:
            db.commit()
            db.refresh(user)

    return user

@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_post(self, info: Info, content: str, author_username: str, type: str = "GENERAL") -> Post:
        db = info.context["db"]
        user = get_or_create_user(db, author_username)

        new_post = models.Post(
            id=f"p_{uuid.uuid4().hex[:8]}", type=type, content=content,
            timestamp=datetime.now(timezone.utc).isoformat(), likes=0, author_id=user.id
        )
        db.add(new_post)
        db.commit()
        db.refresh(new_post)

        user_role_name = user.roles[0].name if user.roles else "User"
        author_obj = Author(username=user.username, email=user.email, avatar=user.avatar, level=user.level, rank=user.rank, tokens=user.tokens, isAdmin=(user_role_name == "Admin"), completedQuests=[], attendedEvents=[])

        log_user_action(db, user.username, "Sent a message")

        return Post(id=new_post.id, type=new_post.type, content=new_post.content, timestamp=new_post.timestamp, likes=new_post.likes, author=author_obj, commentsList=[])

    @strawberry.mutation
    def add_comment(self, info: Info, post_id: str, text: str, author_username: str) -> Comment:
        db = info.context["db"]
        user = get_or_create_user(db, author_username)

        new_comment = models.Comment(
            id=f"c_{uuid.uuid4().hex[:8]}", text=text, post_id=post_id,
            timestamp=datetime.now(timezone.utc).isoformat(), author_id=user.id
        )
        db.add(new_comment)
        db.commit()
        log_user_action(db, user.username, "Added a comment")
        return Comment(id=new_comment.id, author=user.username, text=new_comment.text, timestamp=new_comment.timestamp)

    @strawberry.mutation
    def update_post(self, info: Info, post_id: str, new_content: str) -> Post:
        db = info.context["db"]
        post = db.query(models.Post).filter(models.Post.id == post_id).first()
        if not post: raise Exception("Post not found")

        post.content = new_content
        db.commit()
        db.refresh(post)

        author_role = post.author.roles[0].name if post.author and post.author.roles else "User"
        author_obj = Author(username=post.author.username, email=post.author.email, avatar=post.author.avatar, level=post.author.level, rank=post.author.rank, tokens=post.author.tokens, isAdmin=(author_role == "Admin"), completedQuests=[], attendedEvents=[])
        comments = [Comment(id=c.id, author=c.author.username if c.author else "Unknown", text=c.text, timestamp=c.timestamp) for c in post.comments_list]

        # Use the current user from context if available, otherwise fallback to author
        log_user_action(db, post.author.username, "Edited a message")

        return Post(id=post.id, type=post.type, content=post.content, timestamp=post.timestamp, likes=post.likes, author=author_obj, commentsList=comments)

    @strawberry.mutation
    def delete_post(self, info: Info, post_id: str) -> bool:
            db = info.context["db"]
            request = info.context.get("request")

            # 1. Unpack the Passport
            auth_header = request.headers.get("authorization")
            payload = verify_token(auth_header) if auth_header else "INVALID"

            if payload in ["EXPIRED", "INVALID"]:
                raise Exception("ACCESS DENIED: Invalid or expired session.")

            current_username = payload.get("sub")
            current_role = payload.get("role")

            # 2. Fetch the target post
            post = db.query(models.Post).filter(models.Post.id == post_id).first()
            if not post:
                return False

            # 3. The ABAC Security Check (Owner OR Moderator)
            is_owner = (post.author.username == current_username)
            is_moderator = (current_role in ["Moderator", "Admin"])

            if not (is_owner or is_moderator):
                raise Exception("ACCESS DENIED: You can only delete your own posts.")

            # 4. Execute Deletion
            db.delete(post)
            db.commit()
            log_user_action(db, current_username, "Deleted a message")
            return True

    @strawberry.mutation(permission_classes=[IsModeratorGuard])
    def delete_comment(self, info: Info, post_id: str, comment_id: str) -> bool:
            db = info.context["db"]
            request = info.context.get("request")

            # 1. Unpack the Passport
            auth_header = request.headers.get("authorization")
            payload = verify_token(auth_header) if auth_header else "INVALID"

            if payload in ["EXPIRED", "INVALID"]:
                raise Exception("ACCESS DENIED: Invalid or expired session.")

            current_username = payload.get("sub")
            current_role = payload.get("role")

            # 2. Fetch the target comment
            comment = db.query(models.Comment).filter(models.Comment.id == comment_id, models.Comment.post_id == post_id).first()
            if not comment:
                return False

            # 3. The ABAC Security Check (Owner OR Moderator)
            is_owner = (comment.author.username == current_username)
            is_moderator = (current_role in ["Moderator", "Admin"])

            if not (is_owner or is_moderator):
                raise Exception("ACCESS DENIED: You can only delete your own comments.")

            # 4. Execute Deletion
            db.delete(comment)
            db.commit()
            log_user_action(db, current_username, "Deleted a comment")
            return True

    @strawberry.mutation(permission_classes=[IsAdminGuard])
    def create_quest(self, info: Info, title: str, type: str, description: str, difficulty: int, xp_reward: int, lat: float, lng: float, loc_name: str, cost: str, daytime: str, weather: str, season: str, status: str = "Active", author: str = "System", image_url: Optional[str] = None) -> Quest:
        db = info.context["db"]
        new_quest = models.Quest(
            id=f"q_{uuid.uuid4().hex[:8]}", title=title, type=type, description=description,
            difficulty=difficulty, xp_reward=xp_reward, loc_lat=lat, loc_lng=lng, loc_name=loc_name,
            cost=cost, status=status, author=author, daytime=daytime, weather=weather, season=season, image_url=image_url
        )
        db.add(new_quest)
        db.commit()
        db.refresh(new_quest)

        loc = Location(name=new_quest.loc_name, lat=new_quest.loc_lat, lng=new_quest.loc_lng)
        conds = Conditions(daytime=[getattr(new_quest, 'daytime', "ANY")], weather=[getattr(new_quest, 'weather', "ANY")], season=[getattr(new_quest, 'season', "ANY")])
        return Quest(id=new_quest.id, title=new_quest.title, type=getattr(new_quest, 'type', "Exploration"), description=new_quest.description, difficulty=getattr(new_quest, 'difficulty', 3), xpReward=new_quest.xp_reward, backgroundImage=new_quest.image_url, location=loc, conditions=conds, author=getattr(new_quest, 'author', "System"), cost=getattr(new_quest, 'cost', "None"), status=getattr(new_quest, 'status', "Active"))

    @strawberry.mutation(permission_classes=[IsAdminGuard])
    def update_quest(self, info: Info, quest_id: str, title: str, type: str, description: str, difficulty: int, xp_reward: int, lat: float, lng: float, loc_name: str, cost: str, status: str, daytime: str, weather: str, season: str, image_url: Optional[str] = None) -> Quest:
        db = info.context["db"]
        quest = db.query(models.Quest).filter(models.Quest.id == quest_id).first()
        if not quest: raise Exception("Quest not found")

        quest.title = title
        quest.type = type
        quest.description = description
        quest.difficulty = difficulty
        quest.xp_reward = xp_reward
        quest.loc_lat = lat
        quest.loc_lng = lng
        quest.loc_name = loc_name
        quest.cost = cost
        quest.status = status
        quest.daytime = daytime
        quest.weather = weather
        quest.season = season
        if image_url:
            quest.image_url = image_url

        db.commit()
        db.refresh(quest)

        loc = Location(name=quest.loc_name, lat=quest.loc_lat, lng=quest.loc_lng)
        conds = Conditions(daytime=[getattr(quest, 'daytime', "ANY")], weather=[getattr(quest, 'weather', "ANY")], season=[getattr(quest, 'season', "ANY")])
        return Quest(id=quest.id, title=quest.title, type=getattr(quest, 'type', "Exploration"), description=quest.description, difficulty=getattr(quest, 'difficulty', 3), xpReward=quest.xp_reward, backgroundImage=quest.image_url, location=loc, conditions=conds, author=getattr(quest, 'author', "System"), cost=getattr(quest, 'cost', "None"), status=getattr(quest, 'status', "Active"))

    @strawberry.mutation(permission_classes=[IsAdminGuard])
    def create_event(self, info: Info, title: str, description: str, date_time: str, location: str, host_username: str, image_url: Optional[str] = None) -> EventType:
        db = info.context["db"]
        user = get_or_create_user(db, host_username)

        new_event = models.Event(
            id=f"e_{uuid.uuid4().hex[:8]}", title=title, description=description,
            date_time=date_time, location=location, host_id=user.id, image_url=image_url
        )
        db.add(new_event)
        db.commit()
        db.refresh(new_event)

        user_role_name = user.roles[0].name if user.roles else "User"
        host_obj = Author(username=user.username, email=user.email, avatar=user.avatar, level=user.level, rank=user.rank, tokens=user.tokens, isAdmin=(user_role_name == "Admin"), completedQuests=[], attendedEvents=[])
        return EventType(id=new_event.id, title=new_event.title, description=new_event.description, dateTime=new_event.date_time, location=new_event.location, imageUrl=new_event.image_url, host=host_obj, attendees=[])

    @strawberry.mutation
    def complete_quest(self, info: Info, quest_id: str, username: str) -> bool:
        db = info.context["db"]
        user = get_or_create_user(db, username)
        quest = db.query(models.Quest).filter(models.Quest.id == quest_id).first()
        if not quest: return False
        if quest not in user.completed_quests:
            user.completed_quests.append(quest)
            user.level += 1
            db.commit()
            return True
        return False

    @strawberry.mutation
    def join_event(self, info: Info, event_id: str, username: str) -> bool:
        db = info.context["db"]
        user = get_or_create_user(db, username)
        event = db.query(models.Event).filter(models.Event.id == event_id).first()
        if not event: return False
        if user not in event.attendees:
            event.attendees.append(user)
            db.commit()
            return True
        return False

    @strawberry.mutation(permission_classes=[IsAdminGuard])
    def delete_quest(self, info: Info, quest_id: str) -> bool:
        db = info.context["db"]
        quest = db.query(models.Quest).filter(models.Quest.id == quest_id).first()
        if quest:
            db.delete(quest)
            db.commit()
            return True
        return False

    @strawberry.mutation
    def register_user(self, info: Info, username: str, email: str, password: str) -> Author:
            db = info.context["db"]
            existing = db.query(models.User).filter((models.User.username == username) | (models.User.email == email)).first()
            if existing:
                raise GraphQLError("User already exists")

            user = get_or_create_user(db, username)
            user.email = email
            user.password = password
            db.commit()

            log_user_action(db, user.username, "Registered new account to the grid")

            user_role_name = user.roles[0].name if user.roles else "User"
            session_token = create_access_token(username=user.username, role_name=user_role_name)

            return Author(
                username=user.username,
                email=user.email or email,
                avatar=user.avatar or "Runner1",
                level=user.level or 1,
                rank=user.rank or "Rookie",
                tokens=user.tokens if user.tokens is not None else 5,
                isAdmin=(user_role_name == "Admin"),
                completedQuests=[],
                attendedEvents=[],
                access_token=session_token

            )
    @strawberry.mutation
    def login_user(self, info: Info, email: str, password: str) -> Author:
        db = info.context["db"]
        user = db.query(models.User).filter(models.User.email == email, models.User.password == password).first()
        if not user:
            raise Exception("INVALID CREDENTIALS: Access Denied.")

        # 1. Generate a 6-digit OTP
        otp_code = str(random.randint(100000, 999999))
        expiration = datetime.now(timezone.utc) + timedelta(minutes=5)

        # 2. Save it to the database
        user.mfa_code = otp_code
        user.mfa_expires = expiration
        db.commit()

        # 3. Fire the email through the secure tunnel
        html_content = f"""
        <div style="font-family: monospace; background-color: #0a0a0c; color: #00d9ff; padding: 30px; border: 1px solid #00d9ff;">
            <h2 style="color: #ffaa00; text-transform: uppercase;">Bored in Cluj : Security Clearance</h2>
            <p>A login attempt was detected. To authorize this connection, enter the following 6-digit encryption key:</p>
            <h1 style="color: #00ffaa; letter-spacing: 5px; font-size: 32px;">{otp_code}</h1>
            <p style="color: #ff0055; font-size: 0.8em;">This code will self-destruct in 5 minutes.</p>
        </div>
        """
        send_system_email(user.email, "Bored in Cluj - Login Verification Code", html_content)

        log_user_action(db, user.username, "Initiated Phase 1 Login (MFA Sent)")

        # 4. Return the Author object, but swap the token for the MFA flag
        user_role_name = user.roles[0].name if user.roles else "User"

        return Author(
            username=user.username,
            email=user.email,
            avatar=user.avatar,
            level=user.level,
            rank=user.rank,
            tokens=user.tokens if user.tokens is not None else 5,
            isAdmin=(user_role_name == "Admin"),
            completedQuests=[],
            attendedEvents=[],
            access_token="MFA_REQUIRED" # <--- The frontend will look for this exact string!
        )

    @strawberry.mutation
    def verify_mfa(self, info: Info, email: str, code: str) -> Author:
        db = info.context["db"]

        # 1. Find the user
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            raise Exception("ACCESS DENIED: User not found in the grid.")

        if not user.mfa_code or not user.mfa_expires:
            raise Exception("ACCESS DENIED: No active security clearance request found. Please login again.")

        # 2. Verify the OTP and Time
        now = datetime.now(timezone.utc)
        expires_at = user.mfa_expires.replace(tzinfo=timezone.utc) if user.mfa_expires.tzinfo is None else user.mfa_expires

        if user.mfa_code != code:
            log_user_action(db, user.username, "Failed MFA attempt (Wrong Code)")
            raise Exception("ACCESS DENIED: Invalid encryption key.")

        if now > expires_at:
            log_user_action(db, user.username, "Failed MFA attempt (Timeout)")
            raise Exception("SESSION TIMEOUT: The encryption key has expired.")

        # 3. Shred the OTP so it can never be reused
        user.mfa_code = None
        user.mfa_expires = None
        db.commit()

        # 4. Phase 2 Complete - Mint the real JWT Passport
        user_role_name = user.roles[0].name if user.roles else "User"
        session_token = create_access_token(username=user.username, role_name=user_role_name)

        log_user_action(db, user.username, "Completed Phase 2 Login (MFA Verified)")

        return Author(
            username=user.username,
            email=user.email,
            avatar=user.avatar,
            level=user.level,
            rank=user.rank,
            tokens=user.tokens if user.tokens is not None else 5,
            isAdmin=(user_role_name == "Admin"),
            completedQuests=[],
            attendedEvents=[],
            access_token=session_token
        )

    @strawberry.mutation
    def consume_token(self, info: Info, username: str) -> bool:
            db = info.context["db"]
            user = db.query(models.User).filter(models.User.username == username).first()

            if not user:
                return False

            # Admins have infinite tokens, bypass DB subtraction entirely
            user_role_name = user.roles[0].name if user.roles else "User"
            if user_role_name == "Admin":
                return True

            # Standard users spend a token
            if user.tokens > 0:
                user.tokens -= 1
                db.commit()

                log_user_action(db, user.username, "Successfully rerolled a quest")

                return True

            log_user_action(db, user.username, "Failed to reroll a quest")

            return False

    @strawberry.mutation
    def request_password_reset(self, info: Info, email: str) -> bool:
        db = info.context["db"]

        # 1. Find the user by email
        user = db.query(models.User).filter(models.User.email == email).first()

        # Security Best Practice: If user doesn't exist, return True anyway
        # so hackers can't fish for registered emails.
        if not user:
            return True

        # 2. Generate a secure, short-lived token (valid for 15 minutes)
        token = uuid.uuid4().hex
        expiration = datetime.now(timezone.utc) + timedelta(minutes=15)

        user.reset_token = token
        user.reset_token_expires = expiration
        db.commit()

        # 3. Send the functional link back over to Vite!
        reset_link = f"https://192.168.56.1:5173/BoredInCluj/?token={token}"

        html_content = f"""
                <div style="font-family: monospace; background-color: #0a0a0c; color: #00d9ff; padding: 30px; border: 1px solid #00d9ff;">
                    <h2 style="color: #00ffaa; text-transform: uppercase;">Bored in Cluj : Security Protocol</h2>
                    <p>A request was made to override the access key for this encrypted email.</p>
                    <p>If you initiated this, click the secure link below to establish a new key. This link will self-destruct in 15 minutes.</p>
                    <br>
                    <a href="{reset_link}" style="background-color: #00d9ff; color: #0a0a0c; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 2px;">OVERWRITE ACCESS KEY</a>
                    <br><br>
                    <p style="color: #ff0055; font-size: 0.8em;">If you did not request this, ignore this transmission. Your current key remains secure.</p>
                </div>
                """
        send_system_email(email, "Bored in Cluj - Access Key Recovery", html_content)

        log_user_action(db, user.username, "Requested a password reset token")
        return True

    @strawberry.mutation
    def reset_password(self, info: Info, token: str, new_password: str) -> bool:
        db = info.context["db"]

        # 1. Look up the user by the token
        user = db.query(models.User).filter(models.User.reset_token == token).first()
        if not user:
            raise Exception("INVALID_TOKEN: This reset link is invalid.")

        # 2. Check if the token has expired
        # Ensure we handle timezone awareness correctly
        now = datetime.now(timezone.utc)
        expires_at = user.reset_token_expires.replace(tzinfo=timezone.utc) if user.reset_token_expires.tzinfo is None else user.reset_token_expires

        if now > expires_at:
            # Clean up the expired token data
            user.reset_token = None
            user.reset_token_expires = None
            db.commit()
            raise Exception("EXPIRED_TOKEN: This reset link has expired.")

        # 3. Update the password and shred the token
        user.password = new_password  # In a later step, we can hash this!
        user.reset_token = None
        user.reset_token_expires = None
        db.commit()

        log_user_action(db, user.username, "Successfully recovered/changed password")
        return True