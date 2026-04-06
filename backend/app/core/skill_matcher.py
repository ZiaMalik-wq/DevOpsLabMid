"""
Smart Skill Matching with Synonyms and Fuzzy Logic
Handles variations, abbreviations, and related technologies.
"""
from difflib import SequenceMatcher
from typing import List, Tuple, Set


DISPLAY_SKILL_NAMES = {
    "c++": "C++",
    "c#": "C#",
    "ci/cd": "CI/CD",
    "api": "API",
    "aws": "AWS",
    "gcp": "GCP",
    "sql": "SQL",
    "mysql": "MySQL",
    "mongodb": "MongoDB",
    "node": "Node.js",
    "nodejs": "Node.js",
    "fastapi": "FastAPI",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "python": "Python",
    "java": "Java",
    "php": "PHP",
    "html": "HTML",
    "css": "CSS",
    "machine learning": "Machine Learning",
    "deep learning": "Deep Learning",
    "scikit-learn": "scikit-learn",
}

# Technology synonyms and variations
SKILL_SYNONYMS = {
    # Programming Languages
    'javascript': ['js', 'javascript', 'ecmascript', 'es6', 'es5', 'node', 'nodejs', 'node.js'],
    'python': ['python', 'python3', 'py', 'python2'],
    'java': ['java', 'java se', 'java ee', 'jdk'],
    'typescript': ['typescript', 'ts'],
    'c++': ['c++', 'cpp', 'cplusplus'],
    'c#': ['c#', 'csharp', 'c sharp', '.net'],
    'php': ['php', 'php7', 'php8'],
    'ruby': ['ruby', 'ruby on rails', 'rails', 'ror'],
    'go': ['go', 'golang'],
    'rust': ['rust', 'rust-lang'],
    'swift': ['swift', 'swiftui'],
    'kotlin': ['kotlin', 'kt'],
    'html': ['html', 'html5', 'html 5'],
    'css': ['css', 'css3', 'css 3', 'cascading style sheets'],
    
    # Frontend Frameworks
    'react': ['react', 'reactjs', 'react.js', 'react native', 'react-native'],
    'angular': ['angular', 'angularjs', 'angular.js', 'ng'],
    'vue': ['vue', 'vuejs', 'vue.js', 'nuxt'],
    'svelte': ['svelte', 'sveltekit'],
    
    # Backend Frameworks
    'django': ['django', 'django rest', 'drf'],
    'flask': ['flask', 'flask-restful'],
    'express': ['express', 'expressjs', 'express.js'],
    'fastapi': ['fastapi', 'fast api'],
    'spring': ['spring', 'spring boot', 'springboot'],
    
    # Databases
    'sql': ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'mssql', 'sql server'],
    'mysql': ['mysql', 'my sql'],
    'postgresql': ['postgresql', 'postgres', 'psql'],
    'mongodb': ['mongodb', 'mongo', 'mongoose'],
    'redis': ['redis', 'redis cache'],
    
    # DevOps & Cloud
    'docker': ['docker', 'containerization', 'containers'],
    'kubernetes': ['kubernetes', 'k8s', 'kubectl'],
    'aws': ['aws', 'amazon web services', 'ec2', 's3', 'lambda'],
    'azure': ['azure', 'microsoft azure'],
    'gcp': ['gcp', 'google cloud', 'google cloud platform'],
    'ci/cd': ['ci/cd', 'cicd', 'continuous integration', 'continuous deployment', 'jenkins', 'gitlab ci', 'github actions'],
    
    # Data Science & ML
    'machine learning': ['machine learning', 'ml', 'artificial intelligence', 'ai'],
    'deep learning': ['deep learning', 'neural networks', 'dl'],
    'tensorflow': ['tensorflow', 'tf', 'keras'],
    'pytorch': ['pytorch', 'torch'],
    'pandas': ['pandas', 'pd'],
    'numpy': ['numpy', 'np'],
    'scikit-learn': ['scikit-learn', 'sklearn', 'scikit'],
    
    # Other Tools
    'git': ['git', 'github', 'gitlab', 'version control'],
    'api': ['api', 'rest api', 'restful', 'graphql'],
    'testing': ['testing', 'unit testing', 'jest', 'pytest', 'junit', 'tdd'],
}

def normalize_skill(skill: str) -> str:
    """Normalize skill name for matching."""
    return skill.lower().strip().replace('-', ' ').replace('_', ' ')


def format_skill(skill: str) -> str:
    """Format canonical skill keys into human-friendly display names."""
    if not skill:
        return ""

    normalized = normalize_skill(skill)
    if normalized in DISPLAY_SKILL_NAMES:
        return DISPLAY_SKILL_NAMES[normalized]

    # Title-case words, but keep common abbreviations reasonable
    if normalized.isupper():
        return normalized

    return " ".join(part.capitalize() for part in normalized.split())

def get_skill_variations(skill: str) -> Set[str]:
    """Get all variations/synonyms of a skill."""
    normalized = normalize_skill(skill)
    
    # Check if skill matches any synonym group
    for key, variations in SKILL_SYNONYMS.items():
        if normalized in [normalize_skill(v) for v in variations]:
            return set([normalize_skill(v) for v in variations])
    
    # If no synonyms found, return the skill itself
    return {normalized}

def fuzzy_match_score(s1: str, s2: str) -> float:
    """
    Calculate fuzzy match score between two strings.
    Returns score between 0.0 and 1.0.
    """
    return SequenceMatcher(None, s1.lower(), s2.lower()).ratio()

def match_skills(
    student_skills: List[str], 
    job_text: str,
    threshold: float = 0.8
) -> Tuple[List[str], List[str]]:
    """
    Smart skill matching with fuzzy logic and synonyms.
    
    Args:
        student_skills: List of skills from student profile
        job_text: Job description text
        threshold: Fuzzy match threshold (0.0 to 1.0)
    
    Returns:
        Tuple of (matching_skills, missing_skills)
    """
    job_text_normalized = normalize_skill(job_text)
    matching_skills = []
    missing_skills = []
    
    for skill in student_skills:
        skill_normalized = normalize_skill(skill)
        skill_variations = get_skill_variations(skill)
        
        # Check if any variation appears in job text
        found = False
        
        # 1. Exact match with variations
        for variation in skill_variations:
            if variation in job_text_normalized:
                matching_skills.append(skill)
                found = True
                break
        
        if found:
            continue
        
        # 2. Fuzzy match for typos or close matches
        # Split job text into words for fuzzy matching
        job_words = job_text_normalized.split()
        for job_word in job_words:
            if len(job_word) < 3:  # Skip very short words
                continue
            
            # Check fuzzy match against skill and its variations
            for variation in skill_variations:
                if len(variation) >= 3:
                    score = fuzzy_match_score(variation, job_word)
                    if score >= threshold:
                        matching_skills.append(skill)
                        found = True
                        break
            
            if found:
                break
        
        if not found:
            missing_skills.append(skill)
    
    return matching_skills, missing_skills

def extract_skills_from_text(text: str) -> List[str]:
    """
    Extract skills from text using pattern matching.
    Useful for extracting skills from resume text.
    """
    if not text:
        return []
    
    text_normalized = normalize_skill(text)
    found_skills = []
    
    # Check for all known skills and their variations
    for key, variations in SKILL_SYNONYMS.items():
        for variation in variations:
            variation_normalized = normalize_skill(variation)
            if variation_normalized in text_normalized:
                found_skills.append(key)
                break  # Only add the canonical skill name once
    
    return list(set(found_skills))  # Remove duplicates

def calculate_skill_match_score(
    student_skills: List[str],
    job_text: str
) -> float:
    """
    Calculate overall skill match score between student and job.
    Returns score between 0.0 and 1.0.
    """
    if not student_skills:
        return 0.0
    
    matching, _ = match_skills(student_skills, job_text)
    return len(matching) / len(student_skills)
