from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# This is your local PostgreSQL connection string. 
# Format: postgresql://<username>:<password>@localhost/<database_name>
# Update "postgres" and "password" to match your local setup!
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin@localhost/boredincluj"

# The Engine is the core interface to the database
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# The SessionLocal class is your actual database workspace
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base is the foundation class that all our ORM models will inherit from
Base = declarative_base()

# A helper function to yield database sessions for your FastAPI/GraphQL endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()