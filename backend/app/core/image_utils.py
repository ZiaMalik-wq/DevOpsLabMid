"""
Image processing utilities for profile image optimization.
Handles resizing, compression, and format conversion.
"""
from io import BytesIO
from PIL import Image
import logging

logger = logging.getLogger(__name__)

# Configuration
MAX_IMAGE_SIZE = (800, 800)  # Max dimensions for profile images (higher for better quality)
JPEG_QUALITY = 90  # Quality for JPEG compression (1-100)
MAX_FILE_SIZE_MB = 5  # Maximum upload size in MB

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": "JPEG",
    "image/jpg": "JPEG", 
    "image/png": "PNG",
    "image/webp": "WEBP",
}


def validate_image(content_type: str, file_size: int) -> tuple[bool, str]:
    """
    Validate image file type and size.
    Returns (is_valid, error_message)
    """
    if content_type not in ALLOWED_CONTENT_TYPES:
        return False, f"Invalid file type. Allowed types: JPEG, PNG, WebP"
    
    max_bytes = MAX_FILE_SIZE_MB * 1024 * 1024
    if file_size > max_bytes:
        return False, f"File too large. Maximum size: {MAX_FILE_SIZE_MB}MB"
    
    return True, ""


def optimize_profile_image(image_bytes: bytes) -> bytes:
    """
    Optimize profile image for storage and fast loading.
    - Resize to max dimensions while maintaining aspect ratio
    - Convert to JPEG for smaller file size
    - Apply compression
    - Strip metadata for privacy
    
    Returns optimized image bytes.
    """
    try:
        # Open image from bytes
        img = Image.open(BytesIO(image_bytes))
        
        # Convert to RGB if necessary (for PNG with transparency, etc.)
        if img.mode in ('RGBA', 'LA', 'P'):
            # Create white background for transparent images
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize if larger than max dimensions (maintain aspect ratio)
        img.thumbnail(MAX_IMAGE_SIZE, Image.Resampling.LANCZOS)
        
        # Save optimized image to bytes
        output = BytesIO()
        img.save(
            output, 
            format='JPEG', 
            quality=JPEG_QUALITY,
            optimize=True,
            progressive=True  # Progressive JPEG for faster perceived loading
        )
        output.seek(0)
        
        optimized_bytes = output.getvalue()
        
        # Log compression stats
        original_size = len(image_bytes)
        new_size = len(optimized_bytes)
        reduction = ((original_size - new_size) / original_size) * 100
        logger.info(f"Image optimized: {original_size} -> {new_size} bytes ({reduction:.1f}% reduction)")
        
        return optimized_bytes
        
    except Exception as e:
        logger.error(f"Error optimizing image: {e}")
        raise ValueError(f"Failed to process image: {str(e)}")


def get_image_dimensions(image_bytes: bytes) -> tuple[int, int]:
    """Get image dimensions (width, height)."""
    try:
        img = Image.open(BytesIO(image_bytes))
        return img.size
    except Exception as e:
        logger.error(f"Error reading image dimensions: {e}")
        return (0, 0)
