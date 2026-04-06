from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import ForeignKey  # <--- Essential for CASCADE
from app.models.auth import Company, User

class Job(SQLModel, table=True):
    __tablename__ = "jobs"

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str
    location: str
    job_type: str
    max_seats: int = 1
    salary_range: Optional[str] = None
    deadline: Optional[datetime] = None 
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    views_count: int = Field(default=0)

    # Link to Company with CASCADE DELETE
    # If Company is deleted, delete all their Jobs
    company_id: int = Field(sa_column_args=[ForeignKey("companies.id", ondelete="CASCADE")])
    
    company: Optional[Company] = Relationship(back_populates="jobs")

class JobView(SQLModel, table=True):
    __tablename__ = "job_views"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Link to Job with CASCADE DELETE
    # If Job is deleted, delete its view history
    job_id: int = Field(sa_column_args=[ForeignKey("jobs.id", ondelete="CASCADE")])
    
    # Link to User with CASCADE DELETE
    # If User is deleted, delete their view history
    user_id: Optional[int] = Field(default=None, sa_column_args=[ForeignKey("users.id", ondelete="CASCADE")])
    
    ip_address: Optional[str] = None
    viewed_at: datetime = Field(default_factory=datetime.utcnow)

class SavedJob(SQLModel, table=True):
    __tablename__ = "saved_jobs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Link to User with CASCADE DELETE
    user_id: int = Field(sa_column_args=[ForeignKey("users.id", ondelete="CASCADE")])
    
    # Link to Job with CASCADE DELETE
    job_id: int = Field(sa_column_args=[ForeignKey("jobs.id", ondelete="CASCADE")])
    
    saved_at: datetime = Field(default_factory=datetime.utcnow)