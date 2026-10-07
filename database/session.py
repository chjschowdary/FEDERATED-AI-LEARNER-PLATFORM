import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from database.models.schema import Base

# Database URL from environment variable, default to local SQLite for frictionless local run
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///database/federaicloud.db")

# SQLite needs connect_args={"check_same_thread": False}
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=10, max_overflow=20)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Initializes tables in database."""
    Base.metadata.create_all(bind=engine)

def get_db():
    """FastAPI Dependency for DB Session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
