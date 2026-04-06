# backend/app/db/session.py
from sqlmodel import create_engine, Session, SQLModel, text
from app.core.config import settings
from app.models.auth import User, Student, Company

# We add "pool_pre_ping=True" to prevent connection drops
engine = create_engine(settings.DATABASE_URL, echo=True, pool_pre_ping=True)

def get_session():
    with Session(engine) as session:
        yield session

# Test function to check connection
def check_db_connection():
    try:
        with Session(engine) as session:
            # Try to execute a simple query
            session.exec(text("SELECT 1"))
        print("Database connection successful!")
    except Exception as e:
        print("Database connection failed!")
        print(e)