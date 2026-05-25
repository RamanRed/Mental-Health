"""
Appointment schemas — request/response Pydantic models for appointments.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class AppointmentCreate(BaseModel):
    """Patient requests an appointment."""
    doctor_id: str
    preferred_date: datetime
    urgency: str = Field(default="normal", pattern="^(normal|urgent|emergency)$")
    patient_notes: Optional[str] = None


class AppointmentAccept(BaseModel):
    """Doctor accepts an appointment, which schedules a consultation."""
    session_type: str = Field(default="early_screening", pattern="^(early_screening|follow_up_1|follow_up_2)$")
    format: str = Field(default="online_video", pattern="^(online_audio|online_video|in_person)$")
    clinical_form_id: Optional[str] = None


class AppointmentReject(BaseModel):
    """Doctor rejects an appointment."""
    rejection_reason: str


class AppointmentResponse(BaseModel):
    """Appointment response details."""
    id: str
    patient_id: str
    doctor_id: str
    preferred_date: datetime
    urgency: str
    status: str
    patient_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None

    model_config = {"from_attributes": True}
