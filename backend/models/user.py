"""
User model — core authentication entity for all roles in MANAS.
The verification_status field is the key identification/trust field.
"""

from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base


class User(Base):
    """
    Core user entity. Every person in the system (patient, guardian, doctor, admin)
    has a User record. The 'verification_status' field controls trust level.
    """
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, index=True)
    phone = Column(String(15), unique=True, nullable=False, index=True)
    username = Column(String(100), nullable=True)  # Display name fallback
    role = Column(String(20), nullable=False)
    # Key identification field — controls what the user can access
    verification_status = Column(String(20), nullable=False, default="pending")
    otp_code = Column(String(6), nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
