"""
DoctorFollowRequest model — tracks follow-up requests sent by doctors to patients.
"""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base


class DoctorFollowRequest(Base):
    """
    A follow-up request from a doctor to a patient.
    Allows doctors to request check-in responses from patients between sessions.
    """
    __tablename__ = "doctor_follow_requests"

    id = Column(String(36), primary_key=True, index=True)
    doctor_id = Column(String(36), ForeignKey("doctor_profiles.id"), nullable=False, index=True)
    patient_id = Column(String(36), ForeignKey("patient_profiles.id"), nullable=False, index=True)
    consultation_id = Column(String(36), ForeignKey("consultations.id"), nullable=True, index=True)
    message = Column(Text, nullable=True)               # Optional message from doctor
    status = Column(String(20), default="pending", nullable=False)  # pending / acknowledged / responded
    patient_response = Column(Text, nullable=True)      # Patient's reply text
    due_date = Column(DateTime, nullable=True)          # Optional deadline for response
    responded_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
