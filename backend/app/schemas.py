from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.models.auth import UserRole
from typing import Optional
from app.models.job import Job
from app.models.application import ApplicationStatus
from typing import List, Optional, Literal

# 1. Schema for User Registration (What the Frontend sends)
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: UserRole = UserRole.STUDENT
    full_name: str

# 2. Schema for User Response (What we send back - NO PASSWORD!)
class UserPublic(BaseModel):
    id: int
    email: str
    role: UserRole
    full_name: Optional[str] = None
    company_profile_id: Optional[int] = None
    profile_image_url: Optional[str] = None
    
# --- Admin Schemas ---
class SystemStats(BaseModel):
    total_users: int
    total_students: int
    total_companies: int
    total_jobs: int
    total_applications: int

class UserAdminView(BaseModel):
    id: int
    email: str
    role: UserRole
    is_active: bool = True
    created_at: datetime

# Token Schema
class Token(BaseModel):
    access_token: str
    token_type: str

class JobCreate(BaseModel):
    title: str
    description: str
    location: str
    job_type: str  # Internship, Full-time, etc.
    salary_range: Optional[str] = None
    max_seats: int = 1
    deadline: Optional[datetime] = None

class JobPublic(JobCreate):
    id: int
    company_id: int
    company_name: Optional[str] = None
    company_location: Optional[str] = None
    company_email: Optional[str] = None
    match_score: Optional[float] = None
    created_at: datetime
    is_active: bool
    views_count: int = 0
    deadline: Optional[datetime] = None
    applications_count: int = 0
    is_saved: bool = False

class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    salary_range: Optional[str] = None
    max_seats: Optional[int] = None
    is_active: Optional[bool] = None
    deadline: Optional[datetime] = None
    
class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    university: Optional[str] = None
    cgpa: Optional[float] = None
    skills: Optional[str] = None
    city: Optional[str] = None 

# Output Schema (Public View)
class StudentPublic(BaseModel):
    full_name: str
    university: Optional[str] = None
    cgpa: Optional[float] = None
    skills: Optional[str] = None
    resume_url: Optional[str] = None
    profile_image_url: Optional[str] = None
    city: Optional[str] = None
    
class JobRecommendation(JobPublic):
    match_score: float
    matching_skills: List[str] = []
    missing_skills: List[str] = []
    why: Optional[str] = None

class ChatQuery(BaseModel):
    query: str

class ChatResponse(BaseModel):
    answer: str
    extracted_filters: dict
    results: List[JobPublic]
    
class CompanyUpdate(BaseModel):
    company_name: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    # We can add 'description' later if we update the DB model

# Output Schema
class CompanyPublic(BaseModel):
    company_name: str
    location: Optional[str] = None
    website: Optional[str] = None
    profile_image_url: Optional[str] = None


class ApplicationBase(BaseModel):
    job_id: int

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationPublic(ApplicationBase):
    id: int
    student_id: int
    status: ApplicationStatus
    applied_at: datetime
    
    # Extra fields for UI display
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    job_location: Optional[str] = None
    

# Output Schema for Company viewing an Applicant
class ApplicantPublic(BaseModel):
    application_id: int
    student_id: int
    full_name: str
    email: str
    university: Optional[str] = None
    cgpa: Optional[float] = None
    skills: Optional[str] = None
    resume_url: Optional[str] = None # The Signed URL
    profile_image_url: Optional[str] = None # Profile picture URL
    status: ApplicationStatus
    applied_at: datetime
    
# Input Schema for updating status
class ApplicationUpdate(BaseModel):
    status: ApplicationStatus
    

class TechnicalQuestion(BaseModel):
    question: str
    expected_answer_key_points: str
    difficulty: Literal["Easy", "Medium", "Hard"]


class BehavioralQuestion(BaseModel):
    question: str
    tip: str


class InterviewPrepResponse(BaseModel):
    technical_questions: List[TechnicalQuestion] = Field(min_length=5, max_length=5)
    behavioral_questions: List[BehavioralQuestion] = Field(min_length=3, max_length=3)
    resume_feedback: str
    
class StatItem(BaseModel):
    label: str
    value: int
    color: Optional[str] = None

class CompanyAnalytics(BaseModel):
    total_active_jobs: int
    total_views: int
    total_applications: int
    hiring_funnel: List[StatItem]
    applicant_skills: List[StatItem] 

class StudentAnalytics(BaseModel):
    total_applications: int
    application_status: List[StatItem]
    market_trends: List[StatItem]


# --- Cover Letter Schemas ---
class CoverLetterRequest(BaseModel):
    job_id: int
    tone: Optional[Literal["professional", "enthusiastic", "confident"]] = "professional"

class CoverLetterResponse(BaseModel):
    cover_letter: str
    key_highlights: List[str]
    word_count: int


# --- Skill Gap Analysis Schemas ---
class LearningResource(BaseModel):
    name: str
    type: Literal["course", "tutorial", "documentation", "project", "book"]
    url: Optional[str] = None
    estimated_time: str  # e.g., "2 hours", "1 week"
    difficulty: Literal["beginner", "intermediate", "advanced"]

class SkillGap(BaseModel):
    skill: str
    importance: Literal["critical", "important", "nice-to-have"]
    current_level: Literal["missing", "basic", "intermediate"]
    target_level: str
    learning_path: List[LearningResource]

class SkillGapAnalysisResponse(BaseModel):
    matched_skills: List[str]
    skill_gaps: List[SkillGap]
    overall_match_percentage: int
    priority_recommendation: str
    estimated_learning_time: str


# --- Notification Schemas ---
class NotificationPublic(BaseModel):
    id: int
    type: str
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

class NotificationList(BaseModel):
    notifications: List[NotificationPublic]
    unread_count: int
    total_count: int

class NotificationMarkRead(BaseModel):
    notification_ids: List[int]