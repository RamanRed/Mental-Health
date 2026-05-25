"""
Questionnaire schemas — request/response models for questionnaire responses.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class QuestionnaireCreate(BaseModel):
    """Create/save a questionnaire response (supports partial completion)."""
    patient_id: str
    domain: str
    questions: List[Dict[str, Any]]  # [{question, answer, score}]
    completed: bool = False


class QuestionnaireResponseSchema(BaseModel):
    """Questionnaire response output."""
    id: str
    patient_id: str
    filled_by: Optional[str] = None
    domain: str
    questions: List[Dict[str, Any]]
    completed: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class DomainDefinition(BaseModel):
    """Domain definition with sample questions."""
    domain: str
    title: str
    description: str
    questions: List[str]
