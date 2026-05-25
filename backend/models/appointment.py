"""
Appointment model — tracks patient appointment requests, statuses, and reasons.
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from database import Base


class Appointment(Base):
    """
    Represents an appointment requested by a patient with a doctor.
    """
    __tablename__ = "appointments"

    id = Column(String(36), primary_key=True, index=True)
    patient_id = Column(String(36), ForeignKey("patient_profiles.id"), nullable=False, index=True)
    doctor_id = Column(String(36), ForeignKey("doctor_profiles.id"), nullable=False, index=True)
    preferred_date = Column(DateTime, nullable=False)
    urgency = Column(String(20), default="normal", nullable=False)  # normal/urgent/emergency
    status = Column(String(20), default="pending", nullable=False)  # pending/accepted/rejected/cancelled
    patient_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
