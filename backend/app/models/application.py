from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field
from enum import Enum
from sqlalchemy import ForeignKey

# Define Status Enum
class ApplicationStatus(str, Enum):
    APPLIED = "applied"
    SHORTLISTED = "shortlisted"
    INTERVIEW = "interview"
    REJECTED = "rejected"
    HIRED = "hired"

class Application(SQLModel, table=True):
    __tablename__ = "applications"

    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: int = Field(sa_column_args=[ForeignKey("jobs.id", ondelete="CASCADE")])
    student_id: int = Field(sa_column_args=[ForeignKey("students.id", ondelete="CASCADE")])
    
    # Metadata
    status: ApplicationStatus = Field(default=ApplicationStatus.APPLIED)
    applied_at: datetime = Field(default_factory=datetime.utcnow)