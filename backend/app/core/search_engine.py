import re
from sqlmodel import Session, select, col, or_
from app.models.job import Job
from app.core.ai import ai_model
from app.core.vector_db import vector_db

class SearchEngine:
    def __init__(self, session: Session):
        self.session = session

    def extract_skills_and_intent(self, query: str) -> dict:
        """
        Step 1: Skill & Keyword Extraction
        (Simulates an LLM using Regex and Logic for speed/free cost)
        """
        query_lower = query.lower()
        
        # 1. Detect Intent
        intent = "search"
        if "remote" in query_lower:
            intent = "remote_search"
        elif "intern" in query_lower:
            intent = "internship_search"

        # 2. Extract Common Tech Skills (Expand this list!)
        # In a real PRO app, an LLM does this. Here we use a fast lookup.
        known_skills = ["python", "react", "sql", "fastapi", "django", "java", "c++", "aws", "docker", "node", "php", "html", "css"]
        extracted_skills = [skill for skill in known_skills if skill in query_lower]

        # 3. Extract Location (Simple heuristic)
        # Assuming location is often proper nouns, but for now let's just look for known cities
        known_cities = ["lahore", "karachi", "islamabad", "boca raton", "remote"]
        extracted_location = next((city for city in known_cities if city in query_lower), None)

        return {
            "intent": intent,
            "skills": extracted_skills,
            "location": extracted_location,
            "raw_query": query
        }

    def hybrid_search(self, metadata: dict, limit: int = 10):
        """
        Step 2 & 3: Hybrid Retrieval (Vector + Keyword)
        """
        query_text = metadata["raw_query"]
        
        # A. Semantic Search (Vector)
        vector = ai_model.generate_embedding(query_text)
        vector_results = vector_db.search(vector=vector, limit=limit)
        vector_ids = {point.id: point.score for point in vector_results}

        # B. Keyword Search (SQL)
        # We search for the raw query OR the extracted skills
        search_terms = [query_text] + metadata["skills"]
        clauses = []
        for term in search_terms:
            pattern = f"%{term}%"
            clauses.append(col(Job.title).ilike(pattern))
            clauses.append(col(Job.description).ilike(pattern))
        
        if metadata["location"]:
            clauses.append(col(Job.location).ilike(f"%{metadata['location']}%"))

        statement = select(Job).where(or_(*clauses)).where(Job.is_active == True).limit(limit)
        sql_jobs = self.session.exec(statement).all()
        
        # C. Merge Results
        # We need a unified list of Job IDs to fetch
        all_job_ids = set(vector_ids.keys()) | {job.id for job in sql_jobs}
        
        # Fetch full objects
        if not all_job_ids:
            return []
            
        final_jobs = self.session.exec(select(Job).where(Job.id.in_(all_job_ids))).all()
        
        # Attach semantic scores (if available, else 0)
        jobs_with_scores = []
        for job in final_jobs:
            score = vector_ids.get(job.id, 0.0) # 0.0 if found via SQL only
            jobs_with_scores.append((job, score))
            
        return jobs_with_scores

    def rerank_results(self, jobs_with_scores, metadata: dict):
        """
        Step 4 & 5: Reranking (The Weighted Formula)
        """
        ranked_results = []
        
        for job, semantic_score in jobs_with_scores:
            # --- SCORING LOGIC ---
            
            # 1. Skill Match (30%)
            job_text = (job.title + " " + job.description).lower()
            matched_skills = [s for s in metadata["skills"] if s in job_text]
            skill_score = len(matched_skills) / len(metadata["skills"]) if metadata["skills"] else 0

            # 2. Location Match (20%)
            loc_score = 0
            if metadata["location"]:
                if metadata["location"] in job.location.lower():
                    loc_score = 1.0
            
            # 3. Intent Boost (10%) - e.g. "Intern" matches "Internship"
            intent_score = 0
            if metadata["intent"] == "internship_search" and "intern" in job.job_type.lower():
                intent_score = 1.0
            
            # Final Weighted Score
            # Semantic (40%) + Skill (30%) + Location (20%) + Intent (10%)
            final_score = (semantic_score * 0.4) + (skill_score * 0.3) + (loc_score * 0.2) + (intent_score * 0.1)
            
            ranked_results.append({
                "job": job,
                "score": round(final_score * 100, 1),
                "matched_skills": matched_skills
            })
            
        # Sort descending
        ranked_results.sort(key=lambda x: x["score"], reverse=True)
        return ranked_results