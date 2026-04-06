"""
Student Embedding Cache Management
Caches AI embeddings to avoid regenerating on every recommendation request.
"""
import json
from datetime import datetime, timedelta
from typing import Optional, List
from sqlmodel import Session
from app.models.auth import Student
from app.core.ai import ai_model
from app.core.embedding_utils import build_student_embedding_text
import logging

logger = logging.getLogger(__name__)

# Cache validity period (embeddings older than this will be regenerated)
CACHE_VALIDITY_DAYS = 7

def get_cached_embedding(student: Student) -> Optional[List[float]]:
    """
    Retrieve cached embedding for a student if valid.
    Returns None if cache is invalid or doesn't exist.
    """
    if not student.embedding_cache or not student.embedding_updated_at:
        return None
    
    # Check if cache is still valid (not older than CACHE_VALIDITY_DAYS)
    cache_age = datetime.utcnow() - student.embedding_updated_at
    if cache_age > timedelta(days=CACHE_VALIDITY_DAYS):
        logger.info(f"Embedding cache expired for student {student.id}")
        return None
    
    try:
        # Parse JSON array back to list of floats
        embedding = json.loads(student.embedding_cache)
        if isinstance(embedding, list) and len(embedding) > 0:
            logger.info(f"Using cached embedding for student {student.id}")
            return embedding
    except (json.JSONDecodeError, TypeError) as e:
        logger.error(f"Failed to parse cached embedding: {e}")
        return None
    
    return None

def generate_and_cache_embedding(
    student: Student, 
    session: Session,
    force_regenerate: bool = False
) -> List[float]:
    """
    Generate embedding for student and cache it in database.
    
    Args:
        student: Student model instance
        session: Database session
        force_regenerate: If True, regenerate even if valid cache exists
    
    Returns:
        List of floats representing the embedding vector
    """
    # Check if we can use cached version
    if not force_regenerate:
        cached = get_cached_embedding(student)
        if cached:
            return cached
    
    # Generate new embedding
    logger.info(f"Generating new embedding for student {student.id}")
    text_to_embed = build_student_embedding_text(student.skills, student.resume_text)
    
    if not text_to_embed:
        logger.warning(f"No text to embed for student {student.id}")
        return []
    
    try:
        # Generate embedding using AI model
        embedding = ai_model.generate_embedding(text_to_embed)
        
        # Cache the embedding in database
        student.embedding_cache = json.dumps(embedding)
        student.embedding_updated_at = datetime.utcnow()
        
        session.add(student)
        session.commit()
        
        logger.info(f"Cached new embedding for student {student.id}")
        return embedding
        
    except Exception as e:
        logger.error(f"Failed to generate embedding: {e}")
        # If generation fails, try to use cached version even if expired
        if student.embedding_cache:
            try:
                return json.loads(student.embedding_cache)
            except:
                pass
        return []

def invalidate_cache(student: Student, session: Session):
    """
    Invalidate (clear) the embedding cache for a student.
    Call this when student's skills or resume changes.
    """
    logger.info(f"Invalidating embedding cache for student {student.id}")
    student.embedding_cache = None
    student.embedding_updated_at = None
    session.add(student)
    session.commit()

def should_regenerate_cache(student: Student) -> bool:
    """
    Check if student's embedding cache should be regenerated.
    Returns True if cache is missing, invalid, or expired.
    """
    if not student.embedding_cache or not student.embedding_updated_at:
        return True
    
    cache_age = datetime.utcnow() - student.embedding_updated_at
    return cache_age > timedelta(days=CACHE_VALIDITY_DAYS)
