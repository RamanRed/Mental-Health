"""
JWT Authentication Middleware
Provides dependency functions for extracting and validating JWT tokens,
and role-based access control.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.auth_service import decode_jwt_token

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    FastAPI dependency: extract and validate the JWT token from the Authorization header.
    Returns the decoded payload containing user_id, role, and verification_status.
    
    Raises:
        HTTPException 401 if token is missing, invalid, or expired.
    """
    token = credentials.credentials
    payload = decode_jwt_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


async def require_patient(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Dependency: require that the current user has the 'patient' role."""
    if current_user.get("role") != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient access required",
        )
    return current_user


async def require_guardian(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Dependency: require that the current user has a guardian role."""
    role = current_user.get("role", "")
    if not role.startswith("guardian_"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Guardian access required",
        )
    return current_user


async def require_doctor(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Dependency: require that the current user has the 'doctor' role."""
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctor access required",
        )
    return current_user


async def require_verified(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Dependency: require that the current user is verified."""
    if current_user.get("verification_status") != "verified":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not yet verified",
        )
    return current_user
