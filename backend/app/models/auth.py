from typing import Optional, List
from datetime import datetime
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import ForeignKey

# 1. Define Roles
class UserRole(str, Enum):
    STUDENT = "STUDENT"
    COMPANY = "COMPANY"
    ADMIN = "ADMIN"

# 2. USERS Table
class User(SQLModel, table=True):
    __tablename__ = "users"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    password_hash: str
    role: UserRole = Field(default=UserRole.STUDENT)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships (Backlinks)
    student_profile: Optional["Student"] = Relationship(back_populates="user")
    company_profile: Optional["Company"] = Relationship(back_populates="user")

# 3. STUDENTS Table
class Student(SQLModel, table=True):
    __tablename__ = "students"

    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Foreign Key linking to User with CASCADE DELETE
    # This ensures if User is deleted, the Student profile is also deleted
    user_id: int = Field(sa_column_args=[ForeignKey("users.id", ondelete="CASCADE")])
    
    university: Optional[str] = None
    city: Optional[str] = None
    resume_url: Optional[str] = None
    profile_image_url: Optional[str] = None
    full_name: str
    cgpa: Optional[float] = None
    skills: Optional[str] = None
    resume_text: Optional[str] = None
    
    # Embedding cache fields
    embedding_cache: Optional[str] = None  # Stores JSON array of embedding vector
    embedding_updated_at: Optional[datetime] = None  # Track when cache was generated
    
    # Relationship
    user: Optional[User] = Relationship(back_populates="student_profile")

# 4. COMPANIES Table
class Company(SQLModel, table=True):
    __tablename__ = "companies"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Foreign Key linking to User with CASCADE DELETE
    user_id: int = Field(sa_column_args=[ForeignKey("users.id", ondelete="CASCADE")])
    
    company_name: str
    location: Optional[str] = None
    website: Optional[str] = None
    profile_image_url: Optional[str] = None
    
    # Relationships
    user: Optional[User] = Relationship(back_populates="company_profile")
    jobs: List["Job"] = Relationship(back_populates="company")