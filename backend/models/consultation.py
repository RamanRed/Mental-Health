"""
Consultation model — tracks doctor-patient sessions including AI-assisted form filling.
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.sql import func
from database import Base


class Consultation(Base):
    """
    Represents a doctor-patient consultation session.
    Tracks scheduling, audio transcription, AI form output, and guardian access.
    """
    __tablename__ = "consultations"

    id = Column(String(36), primary_key=True, index=True)
    patient_id = Column(String(36), ForeignKey("patient_profiles.id"), nullable=False, index=True)
    doctor_id = Column(String(36), ForeignKey("doctor_profiles.id"), nullable=False, index=True)
    session_number = Column(Integer, nullable=True)
    session_type = Column(String(20), nullable=False)  # early_screening/follow_up_1/follow_up_2
    format = Column(String(20), nullable=True)  # online_audio/online_video/in_person
    status = Column(String(20), default="scheduled", nullable=False)  # scheduled/in_progress/completed/cancelled
    scheduled_at = Column(DateTime, nullable=True)
    clinical_form_id = Column(String(36), ForeignKey("clinical_forms.id"), nullable=True)
    # Audio and transcription
    audio_path = Column(String(500), nullable=True)
    transcript = Column(Text, nullable=True)
    # AI-assisted form filling
    ai_form_output = Column(JSON, nullable=True)
    doctor_validated_form = Column(JSON, nullable=True)
    # Summary
    consultation_summary = Column(Text, nullable=True)
    # Guardian access controls
    guardian1_access = Column(Boolean, default=False, nullable=False)
    guardian2_access = Column(Boolean, default=False, nullable=False)
    access_expiry = Column(String(20), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
