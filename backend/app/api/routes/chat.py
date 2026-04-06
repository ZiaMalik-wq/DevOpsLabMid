from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.db.session import get_session
from app.schemas import ChatQuery, ChatResponse, JobPublic
from app.core.search_engine import SearchEngine

router = APIRouter()

@router.post("/search", response_model=ChatResponse)
def intelligent_job_search(
    chat_in: ChatQuery,
    session: Session = Depends(get_session)
):
    """
    Day 22: Intelligent Chat Search.
    Follows the Pipeline: Extract -> Hybrid Search -> Rerank -> Answer.
    """
    engine = SearchEngine(session)

    # 1. Extract
    metadata = engine.extract_skills_and_intent(chat_in.query)
    
    # 2. Hybrid Search
    raw_results = engine.hybrid_search(metadata)
    
    # 3. Rerank
    ranked_results = engine.rerank_results(raw_results, metadata)
    
    # 4. Format Output
    top_jobs = []
    for item in ranked_results[:5]: # Top 5
        job = item["job"]
        job_data = job.model_dump()
        
        # Attach Company Name
        if job.company:
            job_data["company_name"] = job.company.company_name
            job_data["company_location"] = job.company.location
        
        # Attach Score
        job_data["match_score"] = item["score"]
        
        top_jobs.append(JobPublic(**job_data))

    # 5. Generate "AI" Answer (Template based)
    if not top_jobs:
        answer_text = f"I couldn't find any jobs for '{chat_in.query}'. Try broader keywords."
    else:
        best_job = top_jobs[0]
        answer_text = f"I found {len(top_jobs)} jobs. The best match is '{best_job.title}' at {best_job.company_name} ({best_job.match_score}% match)."
        
        if metadata["skills"]:
            answer_text += f" It matches your interest in {', '.join(metadata['skills'])}."

    return ChatResponse(
        answer=answer_text,
        extracted_filters=metadata,
        results=top_jobs
    )