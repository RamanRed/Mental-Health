"""
Consultation schemas — request/response models for doctor-patient sessions.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class ConsultationCreate(BaseModel):
    """Create/schedule a consultation session."""
    patient_id: str
    session_type: str = Field(..., pattern="^(early_screening|follow_up_1|follow_up_2)$")
    format: Optional[str] = Field(None, pattern="^(online_audio|online_video|in_person)$")
    scheduled_at: Optional[datetime] = None
    session_number: Optional[int] = None
    clinical_form_id: Optional[str] = None


class ConsultationUpdate(BaseModel):
    """Update consultation fields."""
    status: Optional[str] = Field(None, pattern="^(scheduled|in_progress|completed|cancelled)$")
    format: Optional[str] = Field(None, pattern="^(online_audio|online_video|in_person)$")
    scheduled_at: Optional[datetime] = None
    audio_path: Optional[str] = None
    transcript: Optional[str] = None
    ai_form_output: Optional[Dict[str, Any]] = None
    consultation_summary: Optional[str] = None
    clinical_form_id: Optional[str] = None


class ConsultationFormUpdate(BaseModel):
    """Doctor-validated form data."""
    doctor_validated_form: Dict[str, Any]


class ConsultationSummaryUpdate(BaseModel):
    """Edit consultation summary."""
    consultation_summary: str


class ConsultationAccessUpdate(BaseModel):
    """Set guardian access for a consultation."""
    guardian1_access: Optional[bool] = None
    guardian2_access: Optional[bool] = None
    access_expiry: Optional[str] = None


class ConsultationResponse(BaseModel):
    """Consultation response."""
    id: str
    patient_id: str
    doctor_id: str
    session_number: Optional[int] = None
    session_type: str
    format: Optional[str] = None
    status: str
    scheduled_at: Optional[datetime] = None
    clinical_form_id: Optional[str] = None
    audio_path: Optional[str] = None
    transcript: Optional[str] = None
    ai_form_output: Optional[Dict[str, Any]] = None
    doctor_validated_form: Optional[Dict[str, Any]] = None
    consultation_summary: Optional[str] = None
    guardian1_access: bool = False
    guardian2_access: bool = False
    access_expiry: Optional[str] = None
    patient_user_id: Optional[str] = None
    patient_name: Optional[str] = None
    doctor_user_id: Optional[str] = None
    doctor_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

