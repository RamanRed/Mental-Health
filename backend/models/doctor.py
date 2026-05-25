"""
DoctorProfile model — extended profile for verified doctors.
registration_number is the unique verification identifier.
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from database import Base


class DoctorProfile(Base):
    """
    Doctor profile with medical credentials.
    The registration_number is the unique medical registration ID.
    """
    __tablename__ = "doctor_profiles"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    specialization = Column(String(255), nullable=True)
    # Unique medical registration number
    registration_number = Column(String(100), unique=True, nullable=False, index=True)
    hospital_affiliation = Column(String(255), nullable=True)
    # Location fields
    village = Column(String(100), nullable=True)
    block = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
