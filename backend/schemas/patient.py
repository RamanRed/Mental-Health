"""
Patient schemas — request/response models for patient profiles and consent.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class PatientProfileResponse(BaseModel):
    """Patient profile response."""
    id: str
    user_id: str
    abha_id: Optional[str] = None
    full_name: str
    age: Optional[int] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    village: Optional[str] = None
    block: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_number: Optional[str] = None
    household_members: Optional[int] = None
    guardian1_id: Optional[str] = None
    guardian2_id: Optional[str] = None
    guardian1_name: Optional[str] = None
    guardian1_phone: Optional[str] = None
    guardian1_type: Optional[str] = None
    guardian2_name: Optional[str] = None
    guardian2_phone: Optional[str] = None
    guardian2_type: Optional[str] = None
    language_preference: str = "en"
    literacy_level: Optional[str] = None
    consent_toggles: Dict[str, Any] = Field(default_factory=dict)
    registered_by: Optional[str] = None
    risk_level: Optional[str] = "low"
    distance_km: Optional[float] = None
    created_at: Optional[datetime] = None

    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}



class PatientProfileUpdate(BaseModel):
    """Updatable patient profile fields."""
    full_name: Optional[str] = None
    abha_id: Optional[str] = None
    age: Optional[int] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    village: Optional[str] = None
    block: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_number: Optional[str] = None
    household_members: Optional[int] = None
    language_preference: Optional[str] = None
    literacy_level: Optional[str] = None


class ConsentUpdate(BaseModel):
    """Update consent toggles."""
    consent_toggles: Dict[str, Any]


class LinkGuardianRequest(BaseModel):
    """Link a guardian to this patient by phone."""
    guardian_phone: str = Field(..., min_length=10, max_length=15)
    slot: str = Field(default="guardian1", pattern="^(guardian1|guardian2)$")
