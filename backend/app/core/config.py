# app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Campus Career AI"
    DATABASE_URL: str
    SECRET_KEY: str
    
    # Qdrant
    QDRANT_URL: str
    QDRANT_API_KEY: str
    QDRANT_COLLECTION: str = "campus_career_jobs"
    
    # JWT
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7 
    
    SUPABASE_URL: str
    SUPABASE_KEY: str
    GROQ_API_KEY: str
    GROQ_MODEL:str = "llama-3.1-8b-instant"

    class Config:
        env_file = ".env"

settings = Settings()