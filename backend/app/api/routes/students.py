from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session
from app.db.session import get_session
from app.models.auth import User, UserRole
from app.api.deps import get_current_user
from app.schemas import StudentUpdate, StudentPublic
from app.core.pdf_utils import extract_text_from_pdf
from app.core.supabase import supabase
from app.core.embedding_cache import generate_and_cache_embedding
from app.core.image_utils import validate_image, optimize_profile_image

router = APIRouter()

@router.get("/profile", response_model=StudentPublic)
def get_student_profile(
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students have profiles")
    
    student = current_user.student_profile
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    # Generate signed URL for resume
    if student.resume_url:
        try:
            path = student.resume_url
            res = supabase.storage.from_("resumes").create_signed_url(path, 3600)
            if isinstance(res, dict) and "signedURL" in res:
                student.resume_url = res["signedURL"]
            elif isinstance(res, str):
                student.resume_url = res
        except Exception as e:
            print(f"Error generating resume signed URL: {e}")
            pass

    # Generate signed URL for profile image
    if student.profile_image_url:
        try:
            path = student.profile_image_url
            res = supabase.storage.from_("profile-images").create_signed_url(path, 3600)
            if isinstance(res, dict) and "signedURL" in res:
                student.profile_image_url = res["signedURL"]
            elif isinstance(res, str):
                student.profile_image_url = res
        except Exception as e:
            print(f"Error generating profile image signed URL: {e}")
            pass

    return student

@router.put("/profile", response_model=StudentPublic)
def update_student_profile(
    student_in: StudentUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Update the logged-in student's profile (University, CGPA, Skills).
    Automatically regenerates embedding cache if skills are updated.
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can update profiles")
    
    student = current_user.student_profile
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Track if skills changed (requires cache regeneration)
    skills_changed = student_in.skills is not None and student_in.skills != student.skills

    # Update fields
    student_data = student_in.model_dump(exclude_unset=True)
    for key, value in student_data.items():
        setattr(student, key, value)

    session.add(student)
    session.commit()
    session.refresh(student)
    
    # Regenerate embedding cache if skills changed
    if skills_changed:
        try:
            generate_and_cache_embedding(student, session, force_regenerate=True)
        except Exception as e:
            print(f"Failed to regenerate embedding cache: {e}")
            # Don't fail the request if caching fails

    return student

@router.post("/resume")
async def upload_resume(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"=== Resume Upload Started for user {current_user.id} ===")
    
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can upload resumes")

    if file.content_type != "application/pdf":
        logger.error(f"Invalid file type: {file.content_type}")
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # 1. Read file into memory
    logger.info("Reading file content...")
    file_content = await file.read()
    logger.info(f"File size: {len(file_content)} bytes")
    
    # 2. Create path: "user_id/filename.pdf"
    safe_filename = file.filename.replace(" ", "_")
    file_path = f"{current_user.id}/{safe_filename}"
    logger.info(f"File path: {file_path}")

    try:
        # 3. Upload to Supabase Private Bucket
        logger.info("Uploading to Supabase...")
        supabase.storage.from_("resumes").upload(
            file=file_content, 
            path=file_path, 
            file_options={"content-type": "application/pdf", "upsert": "true"}
        )
        logger.info("Upload to Supabase successful")
    except Exception as e:
        logger.error(f"Upload Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to upload to cloud storage")

    # 4. Extract text for AI (enhanced extraction)
    logger.info("Extracting text from PDF...")
    try:
        extracted_text = extract_text_from_pdf(file_content)
        logger.info(f"Extracted text length: {len(extracted_text)} characters")
    except Exception as e:
        logger.error(f"PDF extraction error: {e}", exc_info=True)
        extracted_text = ""

    # 5. Update student object
    logger.info("Fetching student profile...")
    student = current_user.student_profile
    if not student:
        logger.error("Student profile not found!")
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    logger.info(f"Student ID: {student.id}")
    student.resume_url = file_path
    student.resume_text = extracted_text
    logger.info("Updated student resume_url and resume_text")
    
    # 6. Save to database first (commit resume_url and resume_text)
    try:
        logger.info("Adding student to session...")
        session.add(student)
        logger.info("Committing to database...")
        session.commit()
        logger.info("Refreshing student object...")
        session.refresh(student)
        logger.info("Database commit successful")
    except Exception as e:
        logger.error(f"Database commit error: {e}", exc_info=True)
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    # 7. Force regenerate embedding cache with the new resume (separate transaction)
    embedding_cached = False
    try:
        logger.info("Force regenerating embedding cache with new resume...")
        generate_and_cache_embedding(student, session, force_regenerate=True)
        embedding_cached = True
        logger.info("Embedding cache regenerated successfully")
    except Exception as e:
        logger.error(f"Failed to generate embedding: {e}", exc_info=True)
        # Continue without caching (non-fatal error)

    # 8. Generate Signed URL for immediate response
    try:
        logger.info("Generating signed URL...")
        signed_url_response = supabase.storage.from_("resumes").create_signed_url(file_path, 600)
        final_url = signed_url_response.get("signedURL") if isinstance(signed_url_response, dict) else signed_url_response
        logger.info("Signed URL generated")
    except Exception as e:
        logger.error(f"Error generating signed URL: {e}", exc_info=True)
        final_url = file_path

    logger.info("=== Resume Upload Completed Successfully ===")
    
    return {
        "message": "Resume uploaded successfully", 
        "resume_url": final_url,
        "text_preview": extracted_text[:100] + "..." if len(extracted_text) > 100 else extracted_text,
        "embedding_cached": embedding_cached
    }


@router.post("/profile-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Upload and optimize profile image for student.
    - Validates file type (JPEG, PNG, WebP) and size (max 5MB)
    - Resizes to max 400x400 while maintaining aspect ratio
    - Compresses to JPEG for optimal storage
    - Stores in Supabase 'profile-images' bucket
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"=== Profile Image Upload Started for user {current_user.id} ===")
    
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can upload profile images")

    # 1. Read file content
    file_content = await file.read()
    file_size = len(file_content)
    logger.info(f"File size: {file_size} bytes, Content-Type: {file.content_type}")
    
    # 2. Validate image
    is_valid, error_msg = validate_image(file.content_type, file_size)
    if not is_valid:
        logger.error(f"Validation failed: {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)

    # 3. Optimize image (resize, compress, convert to JPEG)
    try:
        logger.info("Optimizing image...")
        optimized_content = optimize_profile_image(file_content)
        logger.info(f"Optimized size: {len(optimized_content)} bytes")
    except ValueError as e:
        logger.error(f"Image optimization failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    # 4. Create file path: "profile-images/user_id/profile.jpg"
    file_path = f"{current_user.id}/profile.jpg"
    logger.info(f"File path: {file_path}")

    # 5. Upload to Supabase bucket
    try:
        logger.info("Uploading to Supabase profile-images bucket...")
        supabase.storage.from_("profile-images").upload(
            file=optimized_content,
            path=file_path,
            file_options={"content-type": "image/jpeg", "upsert": "true"}
        )
        logger.info("Upload successful")
    except Exception as e:
        logger.error(f"Upload Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to upload image to cloud storage")

    # 6. Update student profile with image path
    student = current_user.student_profile
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    student.profile_image_url = file_path
    
    try:
        session.add(student)
        session.commit()
        session.refresh(student)
        logger.info("Database updated successfully")
    except Exception as e:
        logger.error(f"Database error: {e}", exc_info=True)
        session.rollback()
        raise HTTPException(status_code=500, detail="Failed to update profile")

    # 7. Generate signed URL for immediate response
    try:
        signed_url_response = supabase.storage.from_("profile-images").create_signed_url(file_path, 3600)
        final_url = signed_url_response.get("signedURL") if isinstance(signed_url_response, dict) else signed_url_response
    except Exception as e:
        logger.error(f"Error generating signed URL: {e}")
        final_url = file_path

    logger.info("=== Profile Image Upload Completed Successfully ===")
    
    return {
        "message": "Profile image uploaded successfully",
        "profile_image_url": final_url
    }