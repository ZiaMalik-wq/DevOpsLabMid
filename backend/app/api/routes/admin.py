from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from app.db.session import get_session
from app.models.auth import User, UserRole
from app.models.job import Job
from app.models.application import Application
from app.schemas import SystemStats, UserAdminView, JobPublic
from app.api.deps import get_current_admin

router = APIRouter()

@router.get("/stats", response_model=SystemStats)
def get_system_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin)
):
    """
    Get high-level system statistics.
    """
    total_users = session.exec(select(func.count(User.id))).one()
    total_students = session.exec(select(func.count(User.id)).where(User.role == UserRole.STUDENT)).one()
    total_companies = session.exec(select(func.count(User.id)).where(User.role == UserRole.COMPANY)).one()
    total_jobs = session.exec(select(func.count(Job.id))).one()
    total_apps = session.exec(select(func.count(Application.id))).one()

    return SystemStats(
        total_users=total_users,
        total_students=total_students,
        total_companies=total_companies,
        total_jobs=total_jobs,
        total_applications=total_apps
    )

@router.get("/users", response_model=list[UserAdminView])
def get_all_users(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin),
    limit: int = 50,
    offset: int = 0
):
    """
    List all users (for moderation).
    """
    users = session.exec(select(User).offset(offset).limit(limit)).all()
    return users

from sqlmodel import delete # Add this import

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin)
):
    """
    Ban/Delete a user.
    Uses raw delete to ensure DB Cascade handles the cleanup.
    """
    # 1. Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Cannot delete another admin")

    # 2. Force Delete using SQL (Bypasses ORM nullification)
    # This sends "DELETE FROM users WHERE id = X" directly to Postgres
    session.exec(delete(User).where(User.id == user_id))
    session.commit()
    
    return {"message": f"User {user.email} has been deleted."}

@router.delete("/jobs/{job_id}")
def force_delete_job(
    job_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin)
):
    """
    Force delete a job (Content moderation).
    """
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    session.delete(job)
    session.commit()
    return {"message": "Job deleted by Admin."}