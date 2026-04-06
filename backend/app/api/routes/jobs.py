from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import Session, func, select
from app.db.session import get_session
from app.models.auth import User, UserRole
from app.models.job import Job, JobView, SavedJob
from app.schemas import JobCreate, JobPublic, JobUpdate, JobRecommendation, CoverLetterRequest, CoverLetterResponse, SkillGapAnalysisResponse
from app.api.deps import get_current_user, get_optional_user
from app.core.ai import ai_model
from app.core.vector_db import vector_db
from app.core.llm import generate_interview_questions, generate_interview_questions_async, generate_cover_letter_async, generate_skill_gap_analysis_async
from app.core.skill_matcher import (
    match_skills,
    calculate_skill_match_score,
    extract_skills_from_text,
    format_skill,
)
from app.core.embedding_cache import generate_and_cache_embedding
import logging
from sqlmodel import select, col, or_
from app.core.embedding_utils import build_student_embedding_text, build_job_embedding_text
from app.models.application import Application


logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/", response_model=list[JobPublic])
def get_all_jobs(
    session: Session = Depends(get_session),
    limit: int = 50,
    location: Optional[str] = None,
    job_type: Optional[str] = None
):
    """
    Get all active jobs with optional filters.
    Supports location and job_type filtering.
    """
    statement = select(Job).where(Job.is_active == True)
    
    # Apply filters
    if location:
        statement = statement.where(col(Job.location).ilike(f"%{location}%"))
    if job_type:
        statement = statement.where(Job.job_type == job_type)
    
    statement = statement.order_by(Job.created_at.desc()).limit(limit)
    
    jobs = session.exec(statement).all()
    
    public_jobs = []
    for job in jobs:
        job_data = job.model_dump()
        if job.company:
            job_data["company_name"] = job.company.company_name
            job_data["company_location"] = job.company.location
        public_jobs.append(JobPublic(**job_data))
        
    return public_jobs

@router.post("/create", response_model=JobPublic)
def create_new_job(
    job_in: JobCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new job posting.
    RESTRICTION: Only users with role 'company' can access this.
    """
    
    # 1. Check Role (Security)
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only companies can post jobs"
        )

    # 2. Check if Company Profile exists (Safety)
    if not current_user.company_profile:
        raise HTTPException(
            status_code=400, 
            detail="Company profile not found for this user"
        )

    # 3. Create Job Object
    # We automatically link it to the logged-in company's ID
    new_job = Job(
        **job_in.model_dump(),
        company_id=current_user.company_profile.id
    )
    
    # 4. Save to DB
    session.add(new_job)
    session.commit()
    session.refresh(new_job)
    
    try:
        # A. Prepare text for the AI (Combine important fields)
        text_to_embed = build_job_embedding_text(
            title=new_job.title,
            description=new_job.description,
            job_type=new_job.job_type,
            location=new_job.location
        )
        
        # B. Generate Vector (List of 384 floats)
        vector = ai_model.generate_embedding(text_to_embed)
        
        # C. Save to Qdrant
        vector_db.upsert_job(
            job_id=new_job.id,
            vector=vector,
            metadata={
                "company_id": new_job.company_id,
                "job_type": new_job.job_type,
                "location": new_job.location,
                "company_name": current_user.company_profile.company_name
            }
        )
        logger.info(f"Job {new_job.id} embedded and saved to Qdrant.")
        
    except Exception as e:
        logger.error(f"Failed to embed job {new_job.id}: {e}")
        # Note: We don't stop the request. The job is saved in SQL, even if AI fails.
        
    return JobPublic(
        **new_job.model_dump(),
        company_name=current_user.company_profile.company_name,
        company_location=current_user.company_profile.location
    )

@router.get("/search", response_model=list[JobPublic])
def search_jobs_sql(
    q: str,  # The search query (e.g., "Python")
    session: Session = Depends(get_session),
    limit: int = 20,
    location: Optional[str] = None,
    job_type: Optional[str] = None
):
    """
    Keyword-based Search (SQL) with Filters.
    Looks for the query string in Title, Description, or Location.
    Case-insensitive. Supports location and job_type filtering.
    """
    # 1. Build the Query
    # ILIKE is PostgreSQL specific for "Case Insensitive LIKE"
    # We use %query% to find the text anywhere in the string
    query_pattern = f"%{q}%"
    
    statement = select(Job).where(
        or_(
            col(Job.title).ilike(query_pattern),
            col(Job.description).ilike(query_pattern),
            col(Job.location).ilike(query_pattern)
        )
    ).where(Job.is_active == True)
    
    # Apply filters
    if location:
        statement = statement.where(col(Job.location).ilike(f"%{location}%"))
    if job_type:
        statement = statement.where(Job.job_type == job_type)
    
    statement = statement.limit(limit)

    # 2. Execute
    jobs = session.exec(statement).all()

    # 3. Format Response (Add Company Name)
    public_jobs = []
    for job in jobs:
        job_data = job.model_dump()
        if job.company:
            job_data["company_name"] = job.company.company_name
            job_data["company_location"] = job.company.location
        public_jobs.append(JobPublic(**job_data))
        
    return public_jobs

@router.get("/semantic", response_model=list[JobPublic])
def search_jobs_semantic(
    q: str, 
    session: Session = Depends(get_session),
    limit: int = 10,
    location: Optional[str] = None,
    job_type: Optional[str] = None
):
    """
    Semantic Search (AI-Powered) with Filters.
    1. Converts query -> Vector.
    2. Finds nearest neighbors in Qdrant.
    3. Returns matching jobs from SQL.
    4. Applies location and job_type filters.
    """
    if not q:
        return []

    # 1. Generate Embedding for the query
    # e.g., "I want to build apps" -> [0.1, -0.5, ...]
    query_vector = ai_model.generate_embedding(q)

    # 2. Search in Vector DB
    # Returns a list of ScoredPoint objects (id, score, payload)
    search_results = vector_db.search(vector=query_vector, limit=limit)

    if not search_results:
        return []

    # 3. Extract Job IDs from the results
    # Qdrant returns IDs as integers (because we saved them as ints)
    job_ids = [result.id for result in search_results]

    # 4. Fetch full Job details from SQL with filters
    # We use .in_(job_ids) to get them all in one query
    statement = select(Job).where(Job.id.in_(job_ids))
    
    # Apply filters
    if location:
        statement = statement.where(col(Job.location).ilike(f"%{location}%"))
    if job_type:
        statement = statement.where(Job.job_type == job_type)
    
    jobs = session.exec(statement).all()

    # 5. Preserve the Order! 
    # SQL does not return items in the order of the ID list.
    # Qdrant returned the "best match" first, so we must sort the SQL results to match.
    jobs_dict = {job.id: job for job in jobs}
    ordered_jobs = []
    
    for result in search_results:
        job = jobs_dict.get(result.id)
        if job and job.is_active:
            # Convert to schema
            job_data = job.model_dump()
            if job.company:
                job_data["company_name"] = job.company.company_name
                job_data["company_location"] = job.company.location
            
            # Optional: You could attach the "match_score" here if you added it to the Schema
            # job_data["match_score"] = result.score 
            
            ordered_jobs.append(JobPublic(**job_data))

    return ordered_jobs

@router.get("/hybrid", response_model=list[JobPublic])
def search_jobs_hybrid(
    q: str,
    session: Session = Depends(get_session),
    limit: int = 10,
    location: Optional[str] = None,
    job_type: Optional[str] = None
):
    """
    Hybrid Search with Weighted Scoring and Filters.
    Combines SQL Keyword Search (Exact matches) + Vector Semantic Search (Meaning matches).
    Results are ranked by: Semantic Score (70%) + Keyword Match Bonus (30%)
    Supports location and job_type filtering.
    """
    if not q:
        return []

    # 1. Run Semantic Search
    # Convert query -> vector -> Qdrant search
    query_vector = ai_model.generate_embedding(q)
    # Fetch more semantic results for better coverage
    semantic_points = vector_db.search(vector=query_vector, limit=limit * 2)
    
    # Store semantic scores (Qdrant returns scores 0.0 to 1.0)
    semantic_scores = {point.id: point.score for point in semantic_points}
    semantic_job_ids = list(semantic_scores.keys())

    # 2. Run Keyword Search (The "Exact" Search)
    query_pattern = f"%{q}%"
    statement = select(Job).where(
        or_(
            col(Job.title).ilike(query_pattern),
            col(Job.description).ilike(query_pattern),
            col(Job.location).ilike(query_pattern)
        )
    ).where(Job.is_active == True)
    
    # Apply filters to keyword search
    if location:
        statement = statement.where(col(Job.location).ilike(f"%{location}%"))
    if job_type:
        statement = statement.where(Job.job_type == job_type)
    
    statement = statement.limit(limit)
    
    keyword_jobs = session.exec(statement).all()
    keyword_job_ids = [job.id for job in keyword_jobs]

    # 3. Combine & Calculate Weighted Scores
    all_ids = set(semantic_job_ids + keyword_job_ids)
    
    if not all_ids:
        return []

    # 4. Fetch Full Details from SQL with filters
    statement = select(Job).where(Job.id.in_(all_ids))
    
    # Apply filters
    if location:
        statement = statement.where(col(Job.location).ilike(f"%{location}%"))
    if job_type:
        statement = statement.where(Job.job_type == job_type)
    
    final_jobs = session.exec(statement).all()

    # 5. Calculate Combined Scores & Format
    scored_jobs = []
    for job in final_jobs:
        # Semantic score (0.0 to 1.0, weight 70%)
        semantic_score = semantic_scores.get(job.id, 0.0) * 0.7
        
        # Keyword match bonus (weight 30%)
        keyword_bonus = 0.3 if job.id in keyword_job_ids else 0.0
        
        # Combined score
        total_score = semantic_score + keyword_bonus
        
        # Format job data
        job_data = job.model_dump()
        if job.company:
            job_data["company_name"] = job.company.company_name
            job_data["company_location"] = job.company.location
        job_data["match_score"] = round(total_score, 3)
        
        scored_jobs.append((total_score, JobPublic(**job_data)))
    
    # 6. Sort by score (highest first) and return top results
    scored_jobs.sort(key=lambda x: x[0], reverse=True)
    public_jobs = [job for score, job in scored_jobs[:limit]]
        
    return public_jobs


@router.get("/recommendations", response_model=list[JobRecommendation])
def get_job_recommendations(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    limit: int = 5
):
    """
    Advanced AI Recommendation Engine with Smart Skill Matching and Embedding Cache.
    Implements Weighted Scoring: Semantic (50%) + Skill Overlap (30%) + Location (20%)
    Uses cached embeddings to avoid regenerating on every request (huge performance boost!).
    """
    # 1. Validation
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students get recommendations")
    
    student = current_user.student_profile
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # 2. Prepare Skills List for Smart Matching
    # ONLY use profile skills - these are the source of truth set by the student
    student_skills_list = []
    if student.skills:
        student_skills_list = [s.strip() for s in student.skills.split(",") if s.strip()]

    # Extract canonical skill keys from profile
    profile_skill_keys = set(extract_skills_from_text(", ".join(student_skills_list)))

    # 3. Get or Generate Cached Embedding (Performance Optimization!)
    query_vector = generate_and_cache_embedding(student, session)
    
    if not query_vector:
        # Fallback: If no embedding could be generated, return empty list
        logger.warning(f"No embedding available for student {student.id}")
        return []

    # 4. Get Candidates from Qdrant using cached embedding
    search_results = vector_db.search(vector=query_vector, limit=30)
    
    if not search_results:
        return []

    scores_map = {point.id: point.score for point in search_results}
    job_ids = list(scores_map.keys())

    # 5. Fetch Job Data from SQL
    statement = select(Job).where(Job.id.in_(job_ids))
    jobs = session.exec(statement).all()

    final_recommendations = []
    now = datetime.utcnow()

    for job in jobs:
        if not job.is_active:
            continue
        if job.deadline and job.deadline < now:
            continue
            
        # A. Semantic Score (0.0 to 1.0)
        semantic_score = scores_map.get(job.id, 0)

        # B. ENHANCED Skill Overlap Score with Smart Matching
        job_text = job.title + " " + job.description

        # Extract skills implied/required by the job, then compute coverage.
        # Only match against PROFILE SKILLS (student.skills field).
        job_required_keys = sorted(set(extract_skills_from_text(job_text)))

        if job_required_keys:
            matching_required_keys = [k for k in job_required_keys if k in profile_skill_keys]
            missing_required_keys = [k for k in job_required_keys if k not in profile_skill_keys]

            matching_skills = [format_skill(k) for k in matching_required_keys]
            missing_skills = [format_skill(k) for k in missing_required_keys]

            skill_score = len(matching_required_keys) / len(job_required_keys)
        else:
            # Fallback: can't extract job-required skills reliably.
            # Show only positive matches from the student's *profile* skills.
            matching_profile_skills, _ = match_skills(student_skills_list, job_text)
            matching_skills = matching_profile_skills
            missing_skills = []

            skill_score = 0
            if student_skills_list:
                skill_score = len(matching_profile_skills) / len(student_skills_list)

        # C. Location Score
        location_score = 0
        if student.city and job.location:
            # Normalize for comparison
            student_city = student.city.lower().strip()
            job_location = job.location.lower().strip()
            
            if student_city in job_location:
                location_score = 1.0
            elif "remote" in job_location or "hybrid" in job_location:
                location_score = 0.8
            # Partial match (e.g., "New York" in "New York, NY")
            elif any(word in job_location for word in student_city.split() if len(word) > 3):
                location_score = 0.7
        
        # 50% AI + 30% Skills + 20% Location
        final_score = (semantic_score * 0.5) + (skill_score * 0.3) + (location_score * 0.2)
        final_percent = round(final_score * 100, 1)
        
        # Enhanced reason generation
        reason_parts = []
        reason_parts.append(f"AI match: {round(semantic_score*100)}%")
        
        if matching_skills:
            # Show up to 4 matching skills
            skills_display = ', '.join(matching_skills[:4])
            if len(matching_skills) > 4:
                skills_display += f" +{len(matching_skills)-4} more"
            reason_parts.append(f"Matches: {skills_display}")
        
        if location_score >= 0.7:
            if location_score == 1.0:
                reason_parts.append("Location match")
            else:
                reason_parts.append("Remote/Hybrid available")
        
        reason = ". ".join(reason_parts) + "."

        # Prepare Response Object
        job_data = job.model_dump()
        if job.company:
            job_data["company_name"] = job.company.company_name
            job_data["company_location"] = job.company.location
        
        rec = JobRecommendation(
            **job_data,
            match_score=final_percent,
            matching_skills=matching_skills,
            missing_skills=missing_skills,
            why=reason
        )
        final_recommendations.append(rec)

    # 6. Final Sort by Weighted Score
    final_recommendations.sort(key=lambda x: x.match_score, reverse=True)

    return final_recommendations[:limit]

@router.get("/my-jobs", response_model=list[JobPublic])
def read_my_jobs(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.COMPANY or not current_user.company_profile:
        raise HTTPException(status_code=403, detail="Not a company")
        
    # Fetch jobs
    statement = select(Job).where(Job.company_id == current_user.company_profile.id)
    jobs = session.exec(statement).all()
    
    public_jobs = []
    for job in jobs:
        job_data = job.model_dump()
        job_data["company_name"] = current_user.company_profile.company_name
        job_data["company_location"] = current_user.company_profile.location 
        
        app_count = session.exec(
            select(func.count(Application.id)).where(Application.job_id == job.id)
        ).one()
        
        job_data["applications_count"] = app_count
        public_jobs.append(JobPublic(**job_data))
        
    return public_jobs

@router.get("/", response_model=list[JobPublic])
def read_jobs(
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_user),
    offset: int = 0,
    limit: int = 20,
):
    """
    Get all active jobs.
    Public endpoint (no login required to view jobs).
    - For companies: Excludes their own jobs
    - For students/guests: Shows all jobs
    """
    # 1. Base Query: Active jobs only
    statement = select(Job).where(Job.is_active == True)
   
    now = datetime.utcnow()
    statement = statement.where(or_(Job.deadline == None, Job.deadline > now))
    # 2. Filter out company's own jobs if user is a company
    if current_user and current_user.role == UserRole.COMPANY:
        if current_user.company_profile:
            statement = statement.where(Job.company_id != current_user.company_profile.id)
    
    # 3. Apply pagination
    statement = statement.offset(offset).limit(limit)
    jobs = session.exec(statement).all()

    # 4. Enrich with Company Info
    public_jobs = []
    for job in jobs:
        job_data = job.model_dump()
        
        if job.company:
            job_data["company_name"] = job.company.company_name
            job_data["company_location"] = job.company.location
            job_data["is_saved"] = check_is_saved(session, current_user, job.id)
            
        public_jobs.append(JobPublic(**job_data))

    return public_jobs


@router.get("/saved", response_model=list[JobPublic])
def get_saved_jobs(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get all jobs saved by the student."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students have saved jobs")
    
    # First get all saved job records for this user
    saved_records = session.exec(
        select(SavedJob)
        .where(SavedJob.user_id == current_user.id)
        .order_by(SavedJob.saved_at.desc())
    ).all()
    
    # Extract job IDs
    job_ids = [record.job_id for record in saved_records]
    
    if not job_ids:
        return []
    
    # Fetch the actual job objects
    jobs = session.exec(
        select(Job).where(Job.id.in_(job_ids))
    ).all()
    
    public_jobs = []
    for job in jobs:
        job_data = job.model_dump()
        if job.company:
            job_data["company_name"] = job.company.company_name
            job_data["company_location"] = job.company.location
        
        job_data["is_saved"] = True 
        public_jobs.append(JobPublic(**job_data))
        
    return public_jobs

@router.put("/{job_id}", response_model=JobPublic)
def update_job(
    job_id: int,
    job_update: JobUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Update a job posting.
    RESTRICTION: Only the Company that posted the job can update it.
    """
    
    # 1. Find the Job
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # 2. Security: Check if current user is the owner
    # We check if the current user's company_id matches the job's company_id
    if current_user.role != UserRole.COMPANY or not current_user.company_profile:
         raise HTTPException(status_code=403, detail="Not authorized")
         
    if job.company_id != current_user.company_profile.id:
        raise HTTPException(status_code=403, detail="You do not own this job")

    # 3. Update Fields (only if they are provided)
    job_data = job_update.model_dump(exclude_unset=True)
    for key, value in job_data.items():
        setattr(job, key, value)

    # 4. Save
    session.add(job)
    session.commit()
    session.refresh(job)
    
    return job

@router.delete("/{job_id}")
def delete_job(
    job_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a job posting.
    Removes it from both SQL (Postgres) and Vector DB (Qdrant).
    RESTRICTION: Only the Company owner can delete.
    """
    # 1. Find the Job in SQL
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # 2. Security Check (Ownership)
    # Ensure user is a company AND owns this specific job
    if current_user.role != UserRole.COMPANY or not current_user.company_profile:
         raise HTTPException(status_code=403, detail="Not authorized")
         
    if job.company_id != current_user.company_profile.id:
        raise HTTPException(status_code=403, detail="You do not own this job")

    # 3. Delete from SQL
    session.delete(job)
    session.commit()

    # 4. Delete from Qdrant (AI Memory)
    # We do this AFTER SQL commit to ensure we don't delete vector if SQL fails
    vector_db.delete_job(job_id)

    return {"message": "Job deleted successfully"}

@router.get("/{job_id}", response_model=JobPublic)
def read_job_by_id(
    job_id: int,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Get details of a specific job.
    """
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Prepare response with company info
    job_data = job.model_dump()
    if job.company:
        job_data["company_name"] = job.company.company_name
        job_data["company_location"] = job.company.location
        job_data["is_saved"] = check_is_saved(session, current_user, job.id)
        # Get company email from the associated user
        if job.company.user:
            job_data["company_email"] = job.company.user.email
        
    return JobPublic(**job_data)

@router.post("/reindex")
def reindex_all_jobs(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    ADMIN UTILITY: Force re-calculate embeddings for ALL jobs.
    Useful for syncing SQL and Vector DB.
    """
    # Only allow Admin (or Company for now if you haven't made Admin user)
    # Ideally: if current_user.role != UserRole.ADMIN: raise 403
    
    jobs = session.exec(select(Job)).all()
    count = 0
    
    for job in jobs:
        # 1. Generate text
        text_to_embed = build_job_embedding_text(
            title=job.title,
            description=job.description,
            job_type=job.job_type,
            location=job.location,
        )
        
        # 2. Embed
        vector = ai_model.generate_embedding(text_to_embed)
        
        # 3. Upsert
        # We need to fetch company name manually since it might not be loaded
        company_name = job.company.company_name if job.company else "Unknown"
        
        vector_db.upsert_job(
            job_id=job.id,
            vector=vector,
            metadata={
                "company_id": job.company_id,
                "job_type": job.job_type,
                "location": job.location,
                "company_name": company_name
            }
        )
        count += 1
        
    return {"message": f"Successfully re-indexed {count} jobs to Qdrant."}

@router.post("/{job_id}/view")
def increment_job_view(
    job_id: int,
    request: Request,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Track job views. Prevents duplicates from same IP/User within 24 hours.
    """
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # 1. Don't count if Company is viewing their own job
    if current_user and current_user.role == UserRole.COMPANY and current_user.company_profile:
        if job.company_id == current_user.company_profile.id:
            return {"message": "Owner view ignored", "views": job.views_count}
    
    # 2. Check for duplicate view (Last 24 hours)
    ip = request.client.host
    yesterday = datetime.utcnow() - timedelta(days=1)
    
    # Logic: Look for a view on this job, after yesterday, matching EITHER user_id OR ip_address
    query = select(JobView).where(
        JobView.job_id == job_id,
        JobView.viewed_at > yesterday
    )
    
    if current_user:
        query = query.where(or_(JobView.user_id == current_user.id, JobView.ip_address == ip))
    else:
        query = query.where(JobView.ip_address == ip)

    existing_view = session.exec(query).first()
    
    if not existing_view:
        # 3. Create Record
        new_view = JobView(
            job_id=job_id,
            ip_address=ip,
            user_id=current_user.id if current_user else None
        )
        session.add(new_view)
        
        # 4. Increment Counter
        job.views_count += 1
        session.add(job)
        
        session.commit()
        return {"message": "View tracked", "views": job.views_count}
    
    return {"message": "Duplicate view ignored", "views": job.views_count}

def check_is_saved(session: Session, user: Optional[User], job_id: int) -> bool:
    if not user or user.role != UserRole.STUDENT:
        return False
    
    exists = session.exec(
        select(SavedJob)
        .where(SavedJob.user_id == user.id)
        .where(SavedJob.job_id == job_id)
    ).first()
    
    return True if exists else False

@router.post("/{job_id}/save", response_model=dict)
def save_job(
    job_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Save a job for later."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can save jobs")

    # Check if job exists
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Check if already saved
    existing = session.exec(
        select(SavedJob)
        .where(SavedJob.user_id == current_user.id)
        .where(SavedJob.job_id == job_id)
    ).first()

    if existing:
        return {"message": "Job already saved"}

    saved_job = SavedJob(user_id=current_user.id, job_id=job_id)
    session.add(saved_job)
    session.commit()
    
    return {"message": "Job saved successfully"}

@router.delete("/{job_id}/save", response_model=dict)
def unsave_job(
    job_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Unsave a job."""
    statement = select(SavedJob).where(
        SavedJob.user_id == current_user.id,
        SavedJob.job_id == job_id
    )
    saved_job = session.exec(statement).first()
    
    if not saved_job:
        raise HTTPException(status_code=404, detail="Job not in saved list")

    session.delete(saved_job)
    session.commit()
    
    return {"message": "Job removed from saved list"}

@router.post("/{job_id}/interview-prep")
async def get_interview_prep(
    job_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Generates AI-powered interview questions tailored to the student and job.
    Uses async LLM calls to avoid blocking the event loop.
    """
    # 1. Security Check
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can access interview prep")

    # 2. Fetch Job
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # 3. Fetch Student Data
    student = current_user.student_profile
    if not student or not student.resume_text:
        raise HTTPException(
            status_code=400, 
            detail="Please upload your resume first so the AI can analyze it."
        )

    # 4. Generate AI Content (async - non-blocking)
    # We assume 'student.skills' is useful context too
    resume_context = f"Skills: {student.skills}. \nExperience: {student.resume_text}"
    
    ai_result = await generate_interview_questions_async(
        job_title=job.title,
        job_desc=job.description,
        student_resume=resume_context
    )
    
    return ai_result


@router.post("/{job_id}/cover-letter", response_model=CoverLetterResponse)
async def generate_cover_letter(
    job_id: int,
    request: CoverLetterRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Generates an AI-powered personalized cover letter for a specific job.
    Uses the student's profile and resume to create a tailored letter.
    """
    # 1. Security Check
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can generate cover letters")

    # 2. Fetch Job with Company info
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get company name
    company_name = job.company.company_name if job.company else "the company"

    # 3. Fetch Student Data
    student = current_user.student_profile
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    if not student.resume_text and not student.skills:
        raise HTTPException(
            status_code=400, 
            detail="Please complete your profile or upload your resume first."
        )

    # 4. Generate Cover Letter (async - non-blocking)
    cover_letter_result = await generate_cover_letter_async(
        job_title=job.title,
        company_name=company_name,
        job_desc=job.description,
        student_name=student.full_name or "Applicant",
        student_skills=student.skills or "",
        student_resume=student.resume_text or "",
        student_university=student.university,
        tone=request.tone or "professional"
    )
    
    return cover_letter_result


@router.get("/{job_id}/skill-gap", response_model=SkillGapAnalysisResponse)
async def analyze_skill_gap(
    job_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Analyzes the skill gap between a job's requirements and the student's profile.
    Returns matched skills, skill gaps, and personalized learning paths.
    
    This feature helps students:
    - Understand which skills they already have
    - Identify skills they need to develop
    - Get curated learning resources for each gap
    - Estimate time needed to become competitive
    """
    # 1. Security Check
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can analyze skill gaps")

    # 2. Fetch Job
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # 3. Fetch Student Data
    student = current_user.student_profile
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    if not student.resume_text and not student.skills:
        raise HTTPException(
            status_code=400, 
            detail="Please complete your profile or upload your resume first to analyze skill gaps."
        )

    # 4. Generate Skill Gap Analysis (async - non-blocking)
    skill_gap_result = await generate_skill_gap_analysis_async(
        job_title=job.title,
        job_desc=job.description,
        student_skills=student.skills or "",
        student_resume=student.resume_text or ""
    )
    
    return skill_gap_result