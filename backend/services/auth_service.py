"""
Auth Service — JWT token management and OTP simulation.
Phase 1: OTP is always '123456'.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from jose import jwt, JWTError
from config import settings


def generate_otp() -> str:
    """
    Generate an OTP code.
    Phase 1: Always returns '123456' for simulation.
    """
    return "123456"


def verify_otp(stored_otp: str, provided_otp: str) -> bool:
    """
    Verify OTP by simple string comparison.
    
    Args:
        stored_otp: The OTP stored in the database.
        provided_otp: The OTP provided by the user.
    
    Returns:
        True if they match, False otherwise.
    """
    return stored_otp == provided_otp


def create_jwt_token(user_id: str, role: str, verification_status: str) -> str:
    """
    Create a JWT access token.
    
    Args:
        user_id: The user's UUID.
        role: The user's role (patient, guardian_*, doctor, admin).
        verification_status: The user's verification status.
    
    Returns:
        Encoded JWT token string.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRY_MINUTES)
    payload = {
        "sub": user_id,
        "user_id": user_id,
        "role": role,
        "verification_status": verification_status,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and validate a JWT token.
    
    Args:
        token: The JWT token string.
    
    Returns:
        Decoded payload dict if valid, None if invalid/expired.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError:
        return None
