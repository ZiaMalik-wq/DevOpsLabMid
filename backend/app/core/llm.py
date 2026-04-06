import json
import logging
import asyncio
from groq import Groq, AsyncGroq
from pydantic import ValidationError

from app.core.config import settings
from app.schemas import TechnicalQuestion, BehavioralQuestion, InterviewPrepResponse, CoverLetterResponse, SkillGapAnalysisResponse

logger = logging.getLogger(__name__)

# Sync client for backwards compatibility
client = Groq(api_key=settings.GROQ_API_KEY)
# Async client for async endpoints
async_client = AsyncGroq(api_key=settings.GROQ_API_KEY)

FREE_GROQ_MODELS = [
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768"
]


SYSTEM_PROMPT = """
You are an expert Senior Technical Recruiter and Interview Coach.

Your task is to analyze:
1. The job title
2. The job description
3. The candidate’s resume

Then generate interview preparation material that focuses on SKILL GAPS
between the job requirements and the candidate’s resume.

STRICT OUTPUT RULES:
- Output ONLY valid JSON
- Do NOT include markdown
- Do NOT include explanations outside JSON
- All fields must be present
- Do NOT add extra keys

JSON SCHEMA (must match exactly):

{
  "technical_questions": [
    {
      "question": "Clear and role-specific technical interview question",
      "expected_answer_key_points": "Bullet-style key points separated by semicolons",
      "difficulty": "Easy | Medium | Hard"
    }
  ],
  "behavioral_questions": [
    {
      "question": "Behavioral interview question",
      "tip": "Short coaching tip on how to answer using STAR method"
    }
  ],
  "resume_feedback": "Exactly 2 concise sentences explaining how to better align the resume with the job."
}

CONTENT REQUIREMENTS:
- Generate EXACTLY 5 technical questions
- Generate EXACTLY 3 behavioral questions
- At least 3 technical questions must address skills or technologies missing or weak in the resume
- Difficulty distribution:
  - 1 Easy
  - 3 Medium
  - 1 Hard
- Questions must be specific to the provided job title and description
- Avoid generic or textbook-style questions
"""

def _build_user_message(job_title: str, job_desc: str, resume: str) -> str:
    return f"""
JOB TITLE:
{job_title}

JOB DESCRIPTION:
{job_desc}

CANDIDATE RESUME:
{resume[:3000]}
"""


def _call_llm(model: str, system_prompt: str, user_message: str) -> dict:
    """
    Calls Groq LLM (sync) and returns parsed JSON.
    Raises JSONDecodeError or ValidationError if invalid.
    """
    completion = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        temperature=0.5,
        response_format={"type": "json_object"}
    )

    raw_content = completion.choices[0].message.content
    parsed_json = json.loads(raw_content)

    return InterviewPrepResponse.model_validate(parsed_json).model_dump()


async def _call_llm_async(model: str, system_prompt: str, user_message: str) -> dict:
    """
    Calls Groq LLM (async) and returns parsed JSON.
    Raises JSONDecodeError or ValidationError if invalid.
    """
    completion = await async_client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        temperature=0.5,
        response_format={"type": "json_object"}
    )

    raw_content = completion.choices[0].message.content
    parsed_json = json.loads(raw_content)

    return InterviewPrepResponse.model_validate(parsed_json).model_dump()

def generate_interview_questions(
    job_title: str,
    job_desc: str,
    student_resume: str
) -> InterviewPrepResponse:
    """
    Generates validated interview questions using free Groq models only (sync version).
    """

    user_message = _build_user_message(job_title, job_desc, student_resume)

    for model in FREE_GROQ_MODELS:
        try:
            logger.info(f"Generating interview questions using model: {model}")
            return _call_llm(model, SYSTEM_PROMPT, user_message)

        except (json.JSONDecodeError, ValidationError) as e:
            logger.warning(f"Invalid AI response from model {model}", exc_info=e)

        except Exception as e:
            logger.error(f"LLM call failed for model {model}", exc_info=e)

    logger.error("All free Groq models failed. Returning fallback response.")

    return _get_fallback_response()


async def generate_interview_questions_async(
    job_title: str,
    job_desc: str,
    student_resume: str
) -> InterviewPrepResponse:
    """
    Generates validated interview questions using free Groq models only (async version).
    Non-blocking - ideal for FastAPI async endpoints.
    """

    user_message = _build_user_message(job_title, job_desc, student_resume)

    for model in FREE_GROQ_MODELS:
        try:
            logger.info(f"Generating interview questions (async) using model: {model}")
            return await _call_llm_async(model, SYSTEM_PROMPT, user_message)

        except (json.JSONDecodeError, ValidationError) as e:
            logger.warning(f"Invalid AI response from model {model}", exc_info=e)

        except Exception as e:
            logger.error(f"LLM call failed for model {model}", exc_info=e)

    logger.error("All free Groq models failed. Returning fallback response.")

    return _get_fallback_response()


def _get_fallback_response() -> InterviewPrepResponse:
    """Returns a fallback response when all LLM models fail."""
    return InterviewPrepResponse(
        technical_questions=[
            TechnicalQuestion(
                question="Explain a core concept required for this role.",
                expected_answer_key_points="Demonstrates foundational understanding; Explains trade-offs",
                difficulty="Easy"
            )
        ] * 5,
        behavioral_questions=[
            BehavioralQuestion(
                question="Tell me about a challenge you faced during a project.",
                tip="Use the STAR method to structure your response."
            )
        ] * 3,
        resume_feedback="Tailor your resume more closely to the job requirements. Highlight relevant projects and technologies explicitly."
    ).model_dump()


# ============================================================
# COVER LETTER GENERATION
# ============================================================

COVER_LETTER_SYSTEM_PROMPT = """
You are an expert Career Coach and Professional Cover Letter Writer.

Your task is to write a compelling, personalized cover letter that:
1. Highlights the candidate's relevant skills and experience
2. Demonstrates genuine interest in the specific role and company
3. Bridges any skill gaps with enthusiasm to learn
4. Uses a {tone} tone throughout

STRICT OUTPUT RULES:
- Output ONLY valid JSON
- Do NOT include markdown code blocks
- Do NOT include explanations outside JSON
- All fields must be present

JSON SCHEMA (must match exactly):
{{
  "cover_letter": "The full cover letter text with proper paragraphs separated by \\n\\n",
  "key_highlights": ["3-5 key selling points used in the letter"]
}}

CONTENT REQUIREMENTS:
- Length: 250-350 words
- Structure: Opening hook, 2-3 body paragraphs, strong closing with call to action
- Personalize based on the job title and company name
- Reference specific skills from the resume that match job requirements
- Do NOT use generic phrases like "I am writing to apply..."
- Start with something engaging that shows knowledge of the role/company
- End with confidence and a clear call to action
"""


def _build_cover_letter_message(
    job_title: str,
    company_name: str,
    job_desc: str,
    student_name: str,
    student_skills: str,
    student_resume: str,
    student_university: str = None
) -> str:
    university_line = f"University: {student_university}" if student_university else ""
    return f"""
JOB TITLE: {job_title}
COMPANY NAME: {company_name}

JOB DESCRIPTION:
{job_desc[:2000]}

CANDIDATE NAME: {student_name}
{university_line}
CANDIDATE SKILLS: {student_skills}

CANDIDATE RESUME/EXPERIENCE:
{student_resume[:2500]}
"""


async def _call_cover_letter_llm_async(model: str, tone: str, user_message: str) -> dict:
    """
    Calls Groq LLM for cover letter generation (async).
    """
    system_prompt = COVER_LETTER_SYSTEM_PROMPT.format(tone=tone)
    
    completion = await async_client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        temperature=0.7,  # Slightly higher for more creative writing
        response_format={"type": "json_object"}
    )

    raw_content = completion.choices[0].message.content
    parsed_json = json.loads(raw_content)
    
    # Calculate word count
    cover_letter_text = parsed_json.get("cover_letter", "")
    word_count = len(cover_letter_text.split())
    
    return CoverLetterResponse(
        cover_letter=cover_letter_text,
        key_highlights=parsed_json.get("key_highlights", []),
        word_count=word_count
    ).model_dump()


async def generate_cover_letter_async(
    job_title: str,
    company_name: str,
    job_desc: str,
    student_name: str,
    student_skills: str,
    student_resume: str,
    student_university: str = None,
    tone: str = "professional"
) -> dict:
    """
    Generates a personalized cover letter using AI (async version).
    """
    user_message = _build_cover_letter_message(
        job_title=job_title,
        company_name=company_name,
        job_desc=job_desc,
        student_name=student_name,
        student_skills=student_skills,
        student_resume=student_resume,
        student_university=student_university
    )

    for model in FREE_GROQ_MODELS:
        try:
            logger.info(f"Generating cover letter (async) using model: {model}")
            return await _call_cover_letter_llm_async(model, tone, user_message)

        except (json.JSONDecodeError, ValidationError) as e:
            logger.warning(f"Invalid cover letter response from model {model}", exc_info=e)

        except Exception as e:
            logger.error(f"Cover letter LLM call failed for model {model}", exc_info=e)

    logger.error("All free Groq models failed for cover letter. Returning fallback.")
    return _get_cover_letter_fallback(student_name, job_title, company_name)


def _get_cover_letter_fallback(student_name: str, job_title: str, company_name: str) -> dict:
    """Returns a fallback cover letter when all LLM models fail."""
    fallback_letter = f"""Dear Hiring Manager,

I am excited to express my interest in the {job_title} position at {company_name}. With my background and skills, I believe I would be a valuable addition to your team.

Throughout my academic and professional journey, I have developed strong technical and interpersonal skills that align well with this role. I am passionate about continuous learning and am eager to contribute to {company_name}'s mission.

I would welcome the opportunity to discuss how my experience and enthusiasm can benefit your team. Thank you for considering my application.

Best regards,
{student_name}"""

    return CoverLetterResponse(
        cover_letter=fallback_letter,
        key_highlights=[
            "Expressed genuine interest in the role",
            "Highlighted commitment to learning",
            "Professional and concise communication"
        ],
        word_count=len(fallback_letter.split())
    ).model_dump()


# =============================================================================
# SKILL GAP ANALYSIS PROMPTS AND FUNCTIONS
# =============================================================================

SKILL_GAP_SYSTEM_PROMPT = """
You are an expert Career Coach and Learning Path Designer specializing in tech careers.

Your task is to analyze the gap between a job's required skills and a candidate's current skills,
then create a personalized learning path to help them grow.

STRICT OUTPUT RULES:
- Output ONLY valid JSON
- Do NOT include markdown
- Do NOT include explanations outside JSON
- All fields must be present

JSON SCHEMA (must match exactly):
{{
  "matched_skills": ["List of skills the candidate already has that match job requirements"],
  "skill_gaps": [
    {{
      "skill": "Name of the missing/weak skill",
      "importance": "critical | important | nice-to-have",
      "current_level": "missing | basic | intermediate",
      "target_level": "What level is needed for this job",
      "learning_path": [
        {{
          "name": "Resource name (real course/tutorial name)",
          "type": "course | tutorial | documentation | project | book",
          "url": "Real URL to the resource (use popular platforms like Coursera, Udemy, YouTube, freeCodeCamp, official docs)",
          "estimated_time": "e.g., '4 hours', '2 weeks'",
          "difficulty": "beginner | intermediate | advanced"
        }}
      ]
    }}
  ],
  "overall_match_percentage": 75,
  "priority_recommendation": "A 2-sentence actionable recommendation on what to focus on first",
  "estimated_learning_time": "Total time estimate to fill critical gaps, e.g., '2-3 weeks'"
}}

CONTENT REQUIREMENTS:
- Identify ALL skills from the job description (technical and soft skills)
- Be honest about skill gaps - this helps students grow
- For each skill gap, provide 2-3 REAL learning resources with actual URLs
- Use well-known free resources when possible: freeCodeCamp, MDN, official docs, YouTube tutorials
- Include at least one hands-on project idea for each critical skill
- Mark importance accurately:
  * critical = mentioned multiple times or is core to the role
  * important = clearly required but not the main focus
  * nice-to-have = mentioned as preferred or bonus
- Estimate realistic learning times
- Be encouraging in the priority_recommendation - focus on growth potential
"""


def _build_skill_gap_message(
    job_title: str,
    job_desc: str,
    student_skills: str,
    student_resume: str
) -> str:
    return f"""
JOB TITLE: {job_title}

JOB DESCRIPTION:
{job_desc[:2500]}

CANDIDATE'S LISTED SKILLS: {student_skills}

CANDIDATE'S RESUME/EXPERIENCE:
{student_resume[:2500]}
"""


async def _call_skill_gap_llm_async(model: str, user_message: str) -> dict:
    """
    Calls Groq LLM for skill gap analysis (async).
    """
    completion = await async_client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SKILL_GAP_SYSTEM_PROMPT},
            {"role": "user", "content": user_message}
        ],
        temperature=0.4,  # Lower for more consistent analysis
        response_format={"type": "json_object"}
    )

    raw_content = completion.choices[0].message.content
    parsed_json = json.loads(raw_content)
    
    return SkillGapAnalysisResponse.model_validate(parsed_json).model_dump()


async def generate_skill_gap_analysis_async(
    job_title: str,
    job_desc: str,
    student_skills: str,
    student_resume: str
) -> dict:
    """
    Analyzes skill gaps between job requirements and student profile (async version).
    Returns matched skills, gaps, and personalized learning paths.
    """
    user_message = _build_skill_gap_message(
        job_title=job_title,
        job_desc=job_desc,
        student_skills=student_skills,
        student_resume=student_resume
    )

    for model in FREE_GROQ_MODELS:
        try:
            logger.info(f"Generating skill gap analysis (async) using model: {model}")
            return await _call_skill_gap_llm_async(model, user_message)

        except (json.JSONDecodeError, ValidationError) as e:
            logger.warning(f"Invalid skill gap response from model {model}", exc_info=e)

        except Exception as e:
            logger.error(f"Skill gap LLM call failed for model {model}", exc_info=e)

    logger.error("All free Groq models failed for skill gap analysis. Returning fallback.")
    return _get_skill_gap_fallback(job_title)


def _get_skill_gap_fallback(job_title: str) -> dict:
    """Returns a fallback skill gap analysis when all LLM models fail."""
    return SkillGapAnalysisResponse(
        matched_skills=["Unable to analyze - please try again"],
        skill_gaps=[
            {
                "skill": "General Technical Skills",
                "importance": "important",
                "current_level": "basic",
                "target_level": "Proficient",
                "learning_path": [
                    {
                        "name": "freeCodeCamp - Full Stack Development",
                        "type": "course",
                        "url": "https://www.freecodecamp.org/",
                        "estimated_time": "300 hours",
                        "difficulty": "beginner"
                    }
                ]
            }
        ],
        overall_match_percentage=50,
        priority_recommendation=f"We couldn't complete the full analysis for {job_title}. Please try again or review the job description manually to identify key skills to develop.",
        estimated_learning_time="Varies based on current skills"
    ).model_dump()
