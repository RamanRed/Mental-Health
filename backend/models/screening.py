"""
ScreeningResult model — AI-generated risk assessments for patients.
"""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.sql import func
from database import Base


class ScreeningResult(Base):
    """
    AI-generated screening result with risk level and contributing factors.
    Can be triggered weekly, on-demand, or pre-consultation.
    """
    __tablename__ = "screening_results"

    id = Column(String(36), primary_key=True, index=True)
    patient_id = Column(String(36), ForeignKey("patient_profiles.id"), nullable=False, index=True)
    risk_level = Column(String(20), nullable=False)  # low/moderate/high
    contributing_factors = Column(JSON, default=list, nullable=True)
    plain_language_summary = Column(Text, nullable=True)
    trigger_type = Column(String(20), nullable=False)  # weekly/on_demand/pre_consultation
    reviewed_by_doctor = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
