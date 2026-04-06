from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlmodel import Session, select
from app.db.session import get_session
from app.core.config import settings
from app.models.auth import User, UserRole
from typing import Optional


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)

def get_current_user(
    token: str = Depends(oauth2_scheme), 
    session: Session = Depends(get_session)
) -> User:
    """
    Decodes the token, extracts the email, and retrieves the user from DB.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    statement = select(User).where(User.email == email)
    user = session.exec(statement).first()
    
    if user is None:
        raise credentials_exception
        
    return user

def get_optional_user(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    session: Session = Depends(get_session)
) -> Optional[User]:
    """
    Returns User if token is valid, otherwise returns None (Guest).
    Does NOT raise 401.
    """
    if not token:
        return None # No token provided, treat as Guest

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
    except JWTError:
        return None # Invalid token, treat as Guest

    statement = select(User).where(User.email == email)
    user = session.exec(statement).first()
    return user

def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to ensure the user is a Super Admin.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403, 
            detail="The Admin Dashboard is restricted to superusers."
        )
    return current_user