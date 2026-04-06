from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field
from enum import Enum
from sqlalchemy import ForeignKey


class NotificationType(str, Enum):
    APPLICATION_STATUS = "application_status"
    NEW_JOB = "new_job"
    SYSTEM = "system"


class Notification(SQLModel, table=True):
    __tablename__ = "notifications"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(sa_column_args=[ForeignKey("users.id", ondelete="CASCADE")])
    
    # Notification content
    type: NotificationType = Field(default=NotificationType.SYSTEM)
    title: str = Field(max_length=200)
    message: str = Field(max_length=500)
    
    # Optional link to related entity
    link: Optional[str] = Field(default=None, max_length=300)  # e.g., "/jobs/123" or "/my-applications"
    
    # Status
    is_read: bool = Field(default=False)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
