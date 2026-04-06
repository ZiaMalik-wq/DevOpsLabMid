from datetime import datetime
import asyncio
from typing import Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.db.session import get_session
from app.models.auth import User, UserRole
from app.models.job import Job
from app.models.application import Application, ApplicationStatus
from app.schemas import ApplicationPublic, ApplicantPublic
from app.api.deps import get_current_user
from app.models.auth import Company, Student
from app.core.supabase import supabase

router = APIRouter()


def _create_signed_url(bucket: str, path: str) -> Optional[str]:
    """Helper to create a signed URL for a file in Supabase storage."""
    if not path:
        return None
    try:
        res = supabase.storage.from_(bucket).create_signed_url(path, 3600)
        return res.get("signedURL") if isinstance(res, dict) else res
    except Exception:
        return None


async def _create_signed_url_async(bucket: str, path: str) -> Optional[str]:
    """Async wrapper for creating signed URLs - runs in thread pool."""
    if not path:
        return None
    return await asyncio.to_thread(_create_signed_url, bucket, path)


async def _batch_create_signed_urls(
    items: list[Tuple[Optional[str], Optional[str]]]
) -> list[Tuple[Optional[str], Optional[str]]]:
    """
    Batch create signed URLs for multiple items concurrently.
    Each item is a tuple of (resume_path, profile_image_path).
    Returns list of tuples (resume_signed_url, profile_image_signed_url).
    """
    tasks = []
    for resume_path, profile_path in items:
        # Create tasks for both resume and profile image URLs
        tasks.append(_create_signed_url_async("resumes", resume_path))
        tasks.append(_create_signed_url_async("profile-images", profile_path))
    
    # Run all tasks concurrently
    results = await asyncio.gather(*tasks)
    
    # Pair up results (every 2 results belong to one applicant)
    paired_results = []
    for i in range(0, len(results), 2):
        paired_results.append((results[i], results[i + 1]))
    
    return paired_results

@router.post("/{job_id}", response_model=ApplicationPublic)
def apply_to_job(
    job_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Student applies to a Job.
    Uses SQL Transaction with Row Locking to prevent race conditions.
    """
    # 1. Security Check
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can apply to jobs")
    
    if not current_user.student_profile:
        raise HTTPException(status_code=404, detail="Student profile incomplete")

    # 2. START TRANSACTION
    statement = select(Job).where(Job.id == job_id).with_for_update()
    job = session.exec(statement).one_or_none()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if not job.is_active:
        raise HTTPException(status_code=400, detail="This job is closed")

    if job.deadline:
        if datetime.utcnow() > job.deadline:
            raise HTTPException(status_code=400, detail="The application deadline has passed")

    # 3. Check for Duplicate Application
    existing_app = session.exec(
        select(Application)
        .where(Application.job_id == job_id)
        .where(Application.student_id == current_user.student_profile.id)
    ).first()

    if existing_app:
        raise HTTPException(status_code=400, detail="You have already applied for this job")

    # 4. Create Application
    new_application = Application(
        job_id=job.id,
        student_id=current_user.student_profile.id,
        status=ApplicationStatus.APPLIED
    )
    
    session.add(new_application)
    session.commit()
    session.refresh(new_application)

    # 5. Format Response
    return ApplicationPublic(
        id=new_application.id,
        job_id=new_application.job_id,
        student_id=new_application.student_id,
        status=new_application.status,
        applied_at=new_application.applied_at,
        job_title=job.title,
        company_name=job.company.company_name if job.company else "Unknown"
    )


@router.get("/me", response_model=list[ApplicationPublic])
def get_my_applications(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get all applications for the logged-in student.
    Includes Job Title and Company Name for display.
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students have applications")
    
    if not current_user.student_profile:
        return []

    # Fetch applications linked to this student
    # We join Job and Company to get the names in one query
    statement = (
        select(Application, Job, Company)
        .join(Job, Application.job_id == Job.id)
        .join(Company, Job.company_id == Company.id)
        .where(Application.student_id == current_user.student_profile.id)
        .order_by(Application.applied_at.desc())
    )
    
    results = session.exec(statement).all()
    
    # Format output
    applications_list = []
    for application, job, company in results:
        app_data = application.model_dump()
        
        # Manually attach details from the joined tables
        app_data["job_title"] = job.title
        app_data["job_location"] = job.location
        app_data["company_name"] = company.company_name
        
        applications_list.append(ApplicationPublic(**app_data))
        
    return applications_list


@router.get("/job/{job_id}", response_model=list[ApplicantPublic])
async def get_job_applicants(
    job_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Company: View all students who applied to a specific job.
    Includes logic to generate secure Resume Links.
    Uses batched async calls for Supabase signed URLs for better performance.
    """
    # 1. Security: Only Companies allowed
    if current_user.role != UserRole.COMPANY or not current_user.company_profile:
        raise HTTPException(status_code=403, detail="Only companies can view applicants")

    # 2. Security: Verify Job Ownership
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.company_id != current_user.company_profile.id:
        raise HTTPException(status_code=403, detail="You do not own this job posting")

    # 3. Fetch Applications + Student Info + User Email
    statement = (
        select(Application, Student, User)
        .join(Student, Application.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .where(Application.job_id == job_id)
        .order_by(Application.applied_at.desc())
    )
    
    results = session.exec(statement).all()
    
    if not results:
        return []
    
    # 4. Batch create signed URLs for all applicants concurrently
    # Collect all paths that need signing
    url_paths = [
        (student.resume_url, student.profile_image_url)
        for _, student, _ in results
    ]
    
    # Generate all signed URLs in parallel
    signed_urls = await _batch_create_signed_urls(url_paths)
    
    # 5. Format Data with signed URLs
    applicants_list = []
    for i, (application, student, user) in enumerate(results):
        secure_resume_link, secure_profile_image_link = signed_urls[i]
        
        applicant_data = ApplicantPublic(
            application_id=application.id,
            student_id=student.id,
            full_name=student.full_name,
            email=user.email,
            university=student.university,
            cgpa=student.cgpa,
            skills=student.skills,
            resume_url=secure_resume_link,
            profile_image_url=secure_profile_image_link,
            status=application.status,
            applied_at=application.applied_at
        )
        applicants_list.append(applicant_data)
        
    return applicants_list


from app.schemas import ApplicationUpdate # Add this import
from app.models.notification import Notification, NotificationType

# Status change messages for notifications
STATUS_MESSAGES = {
    ApplicationStatus.SHORTLISTED: {
        "title": "🎉 You've been shortlisted!",
        "message": "Great news! Your application for {job_title} at {company_name} has been shortlisted. You're one step closer!"
    },
    ApplicationStatus.INTERVIEW: {
        "title": "📅 Interview Scheduled",
        "message": "Exciting! {company_name} wants to interview you for the {job_title} position. Check your email for details."
    },
    ApplicationStatus.HIRED: {
        "title": "🎊 Congratulations! You're Hired!",
        "message": "Amazing news! You've been hired for {job_title} at {company_name}. Your hard work paid off!"
    },
    ApplicationStatus.REJECTED: {
        "title": "Application Update",
        "message": "Thank you for your interest in {job_title} at {company_name}. Unfortunately, they've decided to proceed with other candidates. Keep applying!"
    }
}

@router.patch("/{application_id}/status", response_model=ApplicationPublic)
def update_application_status(
    application_id: int,
    status_update: ApplicationUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Company updates application status (Shortlisted, Rejected, Hired).
    If HIRED -> Decrement job max_seats.
    Creates a notification for the student.
    """
    # 1. Fetch Application
    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # 2. Fetch Job to verify ownership
    job = session.get(Job, application.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # 3. Security: Only the Job Owner can update
    if current_user.role != UserRole.COMPANY or not current_user.company_profile:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if job.company_id != current_user.company_profile.id:
        raise HTTPException(status_code=403, detail="You do not own this job")

    # Store old status to check if it changed
    old_status = application.status
    new_status = status_update.status

    # 4. Handle HIRED Logic (Seat Decrement)
    # If moving TO Hired status FROM something else
    if new_status == ApplicationStatus.HIRED and old_status != ApplicationStatus.HIRED:
        if job.max_seats > 0:
            job.max_seats -= 1
            session.add(job)
        else:
            raise HTTPException(status_code=400, detail="No seats remaining for this job")

    # 5. Handle UN-HIRED Logic (Seat Increment) - Optional safety
    # If they were hired by mistake and we change it back to Applied/Rejected
    if old_status == ApplicationStatus.HIRED and new_status != ApplicationStatus.HIRED:
        job.max_seats += 1
        session.add(job)

    # 6. Update Status
    application.status = new_status
    session.add(application)
    
    # 7. Create Notification if status changed and it's a meaningful update
    if old_status != new_status and new_status in STATUS_MESSAGES:
        # Get the student's user_id
        student = session.get(Student, application.student_id)
        if student:
            msg_template = STATUS_MESSAGES[new_status]
            company_name = current_user.company_profile.company_name
            
            notification = Notification(
                user_id=student.user_id,
                type=NotificationType.APPLICATION_STATUS,
                title=msg_template["title"],
                message=msg_template["message"].format(
                    job_title=job.title,
                    company_name=company_name
                ),
                link="/my-applications"
            )
            session.add(notification)
    
    session.commit()
    session.refresh(application)

    # 8. Return with Job/Company details for Schema compliance
    return ApplicationPublic(
        id=application.id,
        job_id=application.job_id,
        student_id=application.student_id,
        status=application.status,
        applied_at=application.applied_at,
        job_title=job.title,
        company_name=current_user.company_profile.company_name
    )