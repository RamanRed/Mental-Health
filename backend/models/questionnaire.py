"""
QuestionnaireResponse model — stores patient questionnaire answers across 8 domains.
Supports partial completion (filled over multiple sessions).
"""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from database import Base


class QuestionnaireResponse(Base):
    """
    Stores answers for a specific domain questionnaire.
    The questions field is a JSON array of {question, answer, score} objects.
    """
    __tablename__ = "questionnaire_responses"

    id = Column(String(36), primary_key=True, index=True)
    patient_id = Column(String(36), ForeignKey("patient_profiles.id"), nullable=False, index=True)
    filled_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    domain = Column(String(100), nullable=False)  # e.g. 'overall_wellbeing', 'psychological', 'trauma'
    questions = Column(JSON, default=list, nullable=False)  # [{question, answer, score}]
    completed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
