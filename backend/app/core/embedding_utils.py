import re
from typing import List

def extract_keywords(text: str, max_keywords: int = 50) -> List[str]:
    """
    Extract important keywords from resume text.
    Focuses on technical terms, skills, and key phrases.
    """
    if not text:
        return []
    
    # Common stop words to exclude
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
        'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her'
    }
    
    # Extract words (2+ chars, alphanumeric + some symbols)
    words = re.findall(r'\b[a-zA-Z][a-zA-Z0-9+#./-]*\b', text.lower())
    
    # Filter and count
    word_freq = {}
    for word in words:
        if len(word) >= 2 and word not in stop_words:
            word_freq[word] = word_freq.get(word, 0) + 1
    
    # Sort by frequency and return top keywords
    sorted_keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
    return [word for word, freq in sorted_keywords[:max_keywords]]

def prioritize_resume_sections(resume_text: str) -> str:
    """
    Reorganize resume text to prioritize important sections.
    Skills and Experience come first for better AI matching.
    """
    if not resume_text:
        return ""
    
    # Try to identify sections
    sections = {
        'skills': '',
        'experience': '',
        'education': '',
        'other': resume_text
    }
    
    text_lower = resume_text.lower()
    
    # Extract skills section
    skills_match = re.search(
        r'(skills?|technical skills?|core competencies)[:\s]+(.*?)(?=\n\n[a-z]|\Z)',
        text_lower,
        re.DOTALL | re.IGNORECASE
    )
    if skills_match:
        start, end = skills_match.span()
        sections['skills'] = resume_text[start:end]
    
    # Extract experience section
    exp_match = re.search(
        r'(experience|work experience|professional experience)[:\s]+(.*?)(?=\n\n[a-z]|\Z)',
        text_lower,
        re.DOTALL | re.IGNORECASE
    )
    if exp_match:
        start, end = exp_match.span()
        sections['experience'] = resume_text[start:end]
    
    # Extract education section
    edu_match = re.search(
        r'(education|academic background)[:\s]+(.*?)(?=\n\n[a-z]|\Z)',
        text_lower,
        re.DOTALL | re.IGNORECASE
    )
    if edu_match:
        start, end = edu_match.span()
        sections['education'] = resume_text[start:end]
    
    # Build prioritized text: Skills > Experience > Education > Other
    prioritized = []
    if sections['skills']:
        prioritized.append(sections['skills'])
    if sections['experience']:
        prioritized.append(sections['experience'])
    if sections['education']:
        prioritized.append(sections['education'])
    
    # If we couldn't extract sections, use original text
    if not prioritized:
        return resume_text
    
    return '\n\n'.join(prioritized)

def preprocess_resume_text(resume_text: str) -> str:
    """
    Enhanced resume text preprocessing with better structure preservation.
    """
    if not resume_text:
        return ""
    
    # First, prioritize sections
    text = prioritize_resume_sections(resume_text)
    
    # Clean excessive whitespace while preserving structure
    text = re.sub(r'[ \t]+', ' ', text)  # Multiple spaces to single
    text = re.sub(r'\n{3,}', '\n\n', text)  # Max 2 newlines
    
    # Remove page numbers and headers/footers
    text = re.sub(r'\n\d+\n', '\n', text)
    text = re.sub(r'Page \d+ of \d+', '', text, flags=re.IGNORECASE)
    
    return text.strip()

def build_student_embedding_text(skills: str, resume_text: str) -> str:
    """
    Enhanced student profile text for AI embedding.
    Prioritizes skills and key sections, with increased context limit.
    Note: Only profile skills are used for matching, but resume text provides
    additional context for semantic similarity.
    """
    parts = []

    # 1. Skills (highest priority - these are the ONLY skills used for matching)
    if skills:
        skills_clean = skills.strip()
        parts.append(f"Technical Skills: {skills_clean}")

    # 2. Enhanced resume text with keyword extraction (for semantic context only)
    if resume_text:
        # Preprocess and prioritize
        clean_text = preprocess_resume_text(resume_text)
        
        # Extract keywords for better matching
        keywords = extract_keywords(clean_text, max_keywords=30)
        if keywords:
            parts.append(f"Key expertise: {', '.join(keywords[:20])}")
        
        # Include more context (increased from 2000 to 4000 chars)
        # Prioritized sections come first
        if len(clean_text) > 4000:
            parts.append(f"Experience and Background: {clean_text[:4000]}")
        else:
            parts.append(f"Experience and Background: {clean_text}")

    return " | ".join(parts)

def build_job_embedding_text(title: str, description: str, job_type: str, location: str, skills: str = None) -> str:
    """
    Enhanced job embedding with better structure and keyword focus.
    """
    parts = []
    
    # 1. Title (highest weight)
    if title:
        parts.append(f"Position: {title}")
    
    # 2. Job Type
    if job_type:
        parts.append(f"Type: {job_type}")
    
    # 3. Required Skills (if provided)
    if skills:
        parts.append(f"Required Skills: {skills}")
    
    # 4. Description with keyword extraction
    if description:
        # Clean description
        desc_clean = re.sub(r'\s+', ' ', description).strip()
        
        # Extract key terms from description
        keywords = extract_keywords(desc_clean, max_keywords=25)
        if keywords:
            parts.append(f"Key Requirements: {', '.join(keywords[:15])}")
        
        # Add full description (limit to 3000 chars)
        if len(desc_clean) > 3000:
            parts.append(f"Details: {desc_clean[:3000]}")
        else:
            parts.append(f"Details: {desc_clean}")
    
    # 5. Location
    if location:
        parts.append(f"Location: {location}")
    
    return " | ".join(parts)
