"""
Guardian schemas — response models for guardian profiles.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class GuardianProfileResponse(BaseModel):
    """Guardian profile response."""
    id: str
    user_id: str
    full_name: str
    guardian_type: str
    association_id: Optional[str] = None
    region_village: Optional[str] = None
    region_block: Optional[str] = None
    region_district: Optional[str] = None
    region_state: Optional[str] = None
    organization: Optional[str] = None
    contact_number: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class GuardianProfileUpdate(BaseModel):
    """Updatable guardian profile fields."""
    full_name: Optional[str] = None
    association_id: Optional[str] = None
    region_village: Optional[str] = None
    region_block: Optional[str] = None
    region_district: Optional[str] = None
    region_state: Optional[str] = None
    organization: Optional[str] = None
    contact_number: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class GuardianNoteResponse(BaseModel):
    """Observational note response for doctors."""
    id: str
    patient_id: str
    guardian_id: str
    guardian_name: Optional[str] = None
    note_text: str
    note_type: str
    created_at: datetime

    model_config = {"from_attributes": True}


