from sqlalchemy import Column, String, Integer, Float, ForeignKey, Boolean, Table, Text, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


# ==========================================
# ASSOCIATION TABLES (Many-to-Many for 3NF)
# ==========================================

user_quests = Table(
    'user_quests',
    Base.metadata,
    Column('user_id', String, ForeignKey('users.id'), primary_key=True),
    Column('quest_id', String, ForeignKey('quests.id'), primary_key=True)
)

user_events = Table(
    'user_events',
    Base.metadata,
    Column('user_id', String, ForeignKey('users.id'), primary_key=True),
    Column('event_id', String, ForeignKey('events.id'), primary_key=True)
)

# --- NEW: RBAC ASSOCIATION TABLES ---
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', String, ForeignKey('users.id'), primary_key=True),
    Column('role_id', String, ForeignKey('roles.id'), primary_key=True)
)

role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', String, ForeignKey('roles.id'), primary_key=True),
    Column('permission_id', String, ForeignKey('permissions.id'), primary_key=True)
)

# ==========================================
# ENTITY MODELS
# ==========================================

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)

    avatar = Column(String, default="Runner1")
    level = Column(Integer, default=1)
    rank = Column(String, default="Rookie")

    tokens = Column(Integer, default=5)

    is_banned = Column(Boolean, default=False)
    timeout_until = Column(DateTime, nullable=True)

    completed_quests = relationship("Quest", secondary=user_quests, back_populates="completed_by")
    attended_events = relationship("Event", secondary=user_events, back_populates="attendees")
    posts = relationship("Post", back_populates="author")
    comments = relationship("Comment", back_populates="author")

    reset_token = Column(String, nullable=True, index=True)
    reset_token_expires = Column(DateTime, nullable=True)
    mfa_code = Column(String, nullable=True)
    mfa_expires = Column(DateTime, nullable=True)
    roles = relationship("Role", secondary=user_roles)



class Post(Base):
    __tablename__ = "posts"

    id = Column(String, primary_key=True, index=True)
    type = Column(String, default="GENERAL")
    content = Column(Text, nullable=False)
    timestamp = Column(String, default="Just now")
    likes = Column(Integer, default=0)

    author_id = Column(String, ForeignKey("users.id"))

    author = relationship("User", back_populates="posts")
    comments_list = relationship("Comment", back_populates="post", cascade="all, delete-orphan")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(String, primary_key=True, index=True)
    text = Column(Text, nullable=False)
    timestamp = Column(String, default="Just now")

    post_id = Column(String, ForeignKey("posts.id"))
    author_id = Column(String, ForeignKey("users.id"))

    post = relationship("Post", back_populates="comments_list")
    author = relationship("User", back_populates="comments")


class Quest(Base):
    __tablename__ = "quests"

    id = Column(String, primary_key=True, index=True)
    title = Column(String)
    type = Column(String, default="Exploration")
    description = Column(String)
    author = Column(String, default="System")
    status = Column(String, default="Active")

    difficulty = Column(Integer, default=3)
    xp_reward = Column(Integer, default=250)
    cost = Column(String, default="None")

    loc_lat = Column(Float)
    loc_lng = Column(Float)
    loc_name = Column(String)
    image_url = Column(String, nullable=True)

    daytime = Column(String, default="ANY")
    weather = Column(String, default="ANY")
    season = Column(String, default="ANY")

    completed_by = relationship("User", secondary=user_quests, back_populates="completed_quests")


class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    date_time = Column(String)
    location = Column(String)
    image_url = Column(String, nullable=True)

    host_id = Column(String, ForeignKey("users.id"))
    host = relationship("User")

    attendees = relationship("User", secondary=user_events, back_populates="attended_events")

class Role(Base):
    __tablename__ = "roles"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False) # e.g., "Admin", "User"

    # Links to the permissions this role holds
    permissions = relationship("Permission", secondary=role_permissions)

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False) # e.g., "delete_quest", "ban_user"

class ActionLog(Base):
    """
    Persists every action performed by a logged-in user.
    Format required: USER ID : GROUP_ID [ADMIN/USER] : ACTION_INFORMATION : TIMESTAMP
    """
    __tablename__ = "action_logs"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    group_id = Column(String, nullable=False) # Will store "Admin" or "User"
    action_information = Column(String, nullable=False) # e.g., "Created Quest", "Consumed Token"
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

class ObservationList(Base):
    """
    Stores suspicious users detected by the malevolent behavior algorithm.
    """
    __tablename__ = "observation_list"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    reason = Column(String, nullable=False) # e.g., "Spamming chat", "Mass deleting"
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_reviewed = Column(Boolean, default=False) # Allows the admin to clear the flag later