"""
PatientProfile model — extended profile for patients.
ABHA ID is the unique linkage identifier per PRD.
"""

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON, Boolean, Float
from sqlalchemy.sql import func
from database import Base


class PatientProfile(Base):
    """
    Patient profile with demographics, location, guardian links, and consent.
    The abha_id field is the unique identifier linking across health systems.
    """
    __tablename__ = "patient_profiles"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    # ABHA ID — unique patient identifier across India's health ecosystem
    abha_id = Column(String(50), unique=True, nullable=True, index=True)
    full_name = Column(String(255), nullable=False)
    age = Column(Integer, nullable=True)
    date_of_birth = Column(String(20), nullable=True)
    gender = Column(String(50), nullable=True)
    # Location fields
    village = Column(String(100), nullable=True)
    block = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    contact_number = Column(String(15), nullable=True)
    household_members = Column(Integer, nullable=True)
    # Guardian links
    guardian1_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    guardian2_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    # Preferences
    language_preference = Column(String(50), default="en", nullable=False)
    literacy_level = Column(String(20), nullable=True)  # literate/semi_literate/illiterate
    # Consent management
    consent_toggles = Column(JSON, default=dict, nullable=False)
    # Onboarding details for Saathi chatbot
    reasons = Column(JSON, nullable=True)
    therapist_history = Column(String(500), nullable=True)
    open_text = Column(String(1000), nullable=True)
    # Attribution: who registered this patient
    registered_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
