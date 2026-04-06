from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from app.db.session import get_session
from app.models.auth import User, UserRole, Student
from app.models.job import Job
from app.models.application import Application, ApplicationStatus
from app.api.deps import get_current_user
from app.schemas import CompanyAnalytics, StudentAnalytics, StatItem
from collections import Counter
import re

router = APIRouter()

TECH_KEYWORDS = [
    "python", "react", "node", "sql", "java", "aws", "docker", 
    "typescript", "fastapi", "django", "html", "css", "machine learning",
    "data science", "javascript", "c++", "flutter", "devops"
]

def extract_skills_from_text(text_list: list[str]) -> list[StatItem]:
    """
    Counts frequency of comma-separated skills (e.g. "Python, React").
    Returns top 10 skills.
    """
    all_skills = []
    for text in text_list:
        if text:
            # Split by comma, strip whitespace, convert to title case
            skills = [s.strip().title() for s in text.split(",")]
            all_skills.extend(skills)
            
    # Count frequency
    counts = Counter(all_skills)
    
    # Convert to StatItems (Top 10)
    return [
        StatItem(label=k, value=v) 
        for k, v in counts.most_common(10)
    ]

def scan_jobs_for_trends(jobs: list[Job]) -> list[StatItem]:
    """
    Scans job descriptions to find most mentioned tech keywords.
    """
    word_counts = Counter()
    
    for job in jobs:
        # Combine title and description for scanning
        text = (job.title + " " + job.description).lower()
        
        # Check for each keyword
        for keyword in TECH_KEYWORDS:
            if keyword in text:
                word_counts[keyword.title()] += 1
                
    return [
        StatItem(label=k, value=v) 
        for k, v in word_counts.most_common(10)
    ]

@router.get("/company", response_model=CompanyAnalytics)
def get_company_analytics(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.COMPANY or not current_user.company_profile:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    company_id = current_user.company_profile.id

    # 1. Fetch Jobs
    jobs = session.exec(select(Job).where(Job.company_id == company_id)).all()
    job_ids = [j.id for j in jobs]

    if not job_ids:
        return CompanyAnalytics(
            total_active_jobs=0, total_views=0, total_applications=0,
            hiring_funnel=[], applicant_skills=[]
        )

    # 2. Basic Stats
    total_active = sum(1 for j in jobs if j.is_active)
    total_views = sum(j.views_count for j in jobs)

    # 3. Fetch Applications & Students
    # We join Application -> Student to get the skills
    results = session.exec(
        select(Application, Student)
        .join(Student, Application.student_id == Student.id)
        .where(Application.job_id.in_(job_ids))
    ).all()
    
    total_apps = len(results)
    
    # 4. Funnel Logic
    shortlisted = sum(1 for app, _ in results if app.status == ApplicationStatus.SHORTLISTED)
    hired = sum(1 for app, _ in results if app.status == ApplicationStatus.HIRED)

    funnel = [
        StatItem(label="Total Views", value=total_views, color="#3B82F6"),
        StatItem(label="Applications", value=total_apps, color="#8B5CF6"),
        StatItem(label="Shortlisted", value=shortlisted, color="#F59E0B"),
        StatItem(label="Hired", value=hired, color="#10B981")
    ]

    # 5. Skill Analysis (Tag Cloud Data)
    # Extract 'skills' column from all students who applied
    student_skills_text = [stu.skills for _, stu in results if stu.skills]
    skill_stats = extract_skills_from_text(student_skills_text)

    return CompanyAnalytics(
        total_active_jobs=total_active,
        total_views=total_views,
        total_applications=total_apps,
        hiring_funnel=funnel,
        applicant_skills=skill_stats
    )

@router.get("/student", response_model=StudentAnalytics)
def get_student_analytics(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.STUDENT or not current_user.student_profile:
        raise HTTPException(status_code=403, detail="Not authorized")

    student_id = current_user.student_profile.id

    # 1. My Applications Status
    applications = session.exec(
        select(Application).where(Application.student_id == student_id)
    ).all()

    total_apps = len(applications)
    status_counts = Counter([app.status.value.capitalize() for app in applications])
    
    status_data = [StatItem(label=k, value=v) for k, v in status_counts.items()]

    # 2. Market Trends (Global)
    # Fetch ALL active jobs in the system to see what's trending
    all_active_jobs = session.exec(select(Job).where(Job.is_active == True)).all()
    market_trends_data = scan_jobs_for_trends(all_active_jobs)

    return StudentAnalytics(
        total_applications=total_apps,
        application_status=status_data,
        market_trends=market_trends_data
    )