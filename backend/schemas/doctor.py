"""
Doctor schemas — response models for doctor profiles.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DoctorProfileResponse(BaseModel):
    """Doctor profile response."""
    id: str
    user_id: str
    full_name: str
    specialization: Optional[str] = None
    registration_number: str
    hospital_affiliation: Optional[str] = None
    village: Optional[str] = None
    block: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class DoctorProfileUpdate(BaseModel):
    """Updatable doctor profile fields."""
    full_name: Optional[str] = None
    specialization: Optional[str] = None
    hospital_affiliation: Optional[str] = None
    village: Optional[str] = None
    block: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
