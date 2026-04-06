from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session
from app.db.session import get_session
from app.models.auth import User, UserRole
from app.api.deps import get_current_user
from app.schemas import CompanyUpdate, CompanyPublic
from app.core.supabase import supabase
from app.core.image_utils import validate_image, optimize_profile_image

router = APIRouter()

@router.get("/profile", response_model=CompanyPublic)
def get_company_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get the current logged-in company's profile details.
    """
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Only companies have company profiles")
    
    company = current_user.company_profile
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")

    # Generate signed URL for profile image
    if company.profile_image_url:
        try:
            path = company.profile_image_url
            res = supabase.storage.from_("profile-images").create_signed_url(path, 3600)
            if isinstance(res, dict) and "signedURL" in res:
                company.profile_image_url = res["signedURL"]
            elif isinstance(res, str):
                company.profile_image_url = res
        except Exception as e:
            print(f"Error generating profile image signed URL: {e}")
            pass

    return company

@router.put("/profile", response_model=CompanyPublic)
def update_company_profile(
    company_in: CompanyUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Update company details (Name, Location, Website).
    """
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Only companies can update profiles")
    
    company = current_user.company_profile
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")

    # Update fields
    update_data = company_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(company, key, value)

    session.add(company)
    session.commit()
    session.refresh(company)

    return company


@router.post("/profile-image")
async def upload_company_profile_image(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Upload and optimize profile image for company.
    - Validates file type (JPEG, PNG, WebP) and size (max 5MB)
    - Resizes to max 400x400 while maintaining aspect ratio
    - Compresses to JPEG for optimal storage
    - Stores in Supabase 'profile-images' bucket
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"=== Company Profile Image Upload Started for user {current_user.id} ===")
    
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Only companies can upload profile images")

    # 1. Read file content
    file_content = await file.read()
    file_size = len(file_content)
    logger.info(f"File size: {file_size} bytes, Content-Type: {file.content_type}")
    
    # 2. Validate image
    is_valid, error_msg = validate_image(file.content_type, file_size)
    if not is_valid:
        logger.error(f"Validation failed: {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)

    # 3. Optimize image
    try:
        logger.info("Optimizing image...")
        optimized_content = optimize_profile_image(file_content)
        logger.info(f"Optimized size: {len(optimized_content)} bytes")
    except ValueError as e:
        logger.error(f"Image optimization failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    # 4. Create file path: "company_user_id/profile.jpg"
    file_path = f"company_{current_user.id}/profile.jpg"
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

    # 6. Update company profile with image path
    company = current_user.company_profile
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    company.profile_image_url = file_path
    
    try:
        session.add(company)
        session.commit()
        session.refresh(company)
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

    logger.info("=== Company Profile Image Upload Completed Successfully ===")
    
    return {
        "message": "Profile image uploaded successfully",
        "profile_image_url": final_url
    }