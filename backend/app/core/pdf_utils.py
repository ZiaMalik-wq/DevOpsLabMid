import pdfplumber
import io
import re
from typing import Dict

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Enhanced PDF text extraction with section detection and better structure preservation.
    Returns cleaned, structured text optimized for AI embeddings.
    """
    text_content = []
    
    try:
        print(f"PDF Size: {len(file_bytes)} bytes")
        
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            print(f"Found {len(pdf.pages)} pages")
            
            for i, page in enumerate(pdf.pages):
                # Try regular text extraction first
                text = page.extract_text()
                
                if text and len(text.strip()) > 50:
                    # Clean up text while preserving structure
                    text = text.strip()
                    text_content.append(text)
                    print(f"Page {i+1}: Extracted {len(text)} chars")
                else:
                    # Fallback: Try extracting with layout preservation
                    try:
                        text = page.extract_text(layout=True)
                        if text and len(text.strip()) > 20:
                            text_content.append(text.strip())
                            print(f"Page {i+1}: Extracted {len(text)} chars (layout mode)")
                        else:
                            print(f"Page {i+1}: No text found (possibly image-based)")
                    except:
                        print(f"Page {i+1}: Failed layout extraction")
        
        full_text = "\n".join(text_content)
        
        # Post-process to improve structure
        full_text = clean_pdf_text(full_text)
        
        return full_text
    
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return ""

def clean_pdf_text(text: str) -> str:
    """
    Cleans and structures PDF text for better AI processing.
    Preserves section headers and important formatting.
    """
    if not text:
        return ""
    
    # Remove excessive whitespace but keep paragraph breaks
    text = re.sub(r' +', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Fix common PDF extraction issues
    text = text.replace('•', '- ')
    text = text.replace('◦', '- ')
    text = text.replace('○', '- ')
    
    # Ensure section headers are on new lines
    section_headers = [
        'EXPERIENCE', 'WORK EXPERIENCE', 'PROFESSIONAL EXPERIENCE',
        'EDUCATION', 'ACADEMIC BACKGROUND',
        'SKILLS', 'TECHNICAL SKILLS', 'CORE COMPETENCIES',
        'PROJECTS', 'PERSONAL PROJECTS',
        'CERTIFICATIONS', 'ACHIEVEMENTS', 'AWARDS',
        'SUMMARY', 'OBJECTIVE', 'PROFILE'
    ]
    
    for header in section_headers:
        # Add newlines around section headers for better structure
        text = re.sub(f'({header})', r'\n\n\1\n', text, flags=re.IGNORECASE)
    
    # Clean up multiple spaces again after processing
    text = re.sub(r' +', ' ', text)
    text = text.strip()
    
    return text

def extract_sections(text: str) -> Dict[str, str]:
    """
    Extracts key sections from resume text for prioritized embedding.
    Returns dict with section names as keys and content as values.
    """
    sections = {
        'skills': '',
        'experience': '',
        'education': '',
        'projects': '',
        'other': ''
    }
    
    if not text:
        return sections
    
    text_lower = text.lower()
    
    # Define section patterns
    patterns = {
        'skills': r'(skills?|technical skills?|core competencies)(.*?)(?=\n\n[A-Z]|\Z)',
        'experience': r'(experience|work experience|professional experience)(.*?)(?=\n\n[A-Z]|\Z)',
        'education': r'(education|academic background)(.*?)(?=\n\n[A-Z]|\Z)',
        'projects': r'(projects?|personal projects?)(.*?)(?=\n\n[A-Z]|\Z)'
    }
    
    for section_key, pattern in patterns.items():
        match = re.search(pattern, text_lower, re.DOTALL | re.IGNORECASE)
        if match:
            # Get the actual text from original (preserves case)
            start_pos = match.start()
            end_pos = match.end()
            sections[section_key] = text[start_pos:end_pos].strip()
    
    # Store remaining text
    sections['other'] = text
    
    return sections