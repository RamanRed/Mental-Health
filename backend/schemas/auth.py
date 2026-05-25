"""
Auth schemas — request/response models for authentication and registration.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


# --- Request Models ---

class CheckUserRequest(BaseModel):
    """Check if a user exists by phone and role."""
    phone: str = Field(..., min_length=10, max_length=15)
    role: str = Field(..., pattern="^(patient|guardian_family|guardian_asha|guardian_ngo|guardian_anganwadi|doctor|admin)$")


class OTPRequest(BaseModel):
    """Request OTP for a phone number."""
    phone: str = Field(..., min_length=10, max_length=15)


class OTPVerify(BaseModel):
    """Verify OTP and get JWT token."""
    phone: str = Field(..., min_length=10, max_length=15)
    otp: str = Field(..., min_length=6, max_length=6)
    role: str = Field(..., pattern="^(patient|guardian_family|guardian_asha|guardian_ngo|guardian_anganwadi|doctor|admin)$")


class RegisterPatient(BaseModel):
    """Full patient registration payload."""
    phone: str = Field(..., min_length=10, max_length=15)
    full_name: str = Field(..., min_length=1, max_length=255)
    abha_id: Optional[str] = None
    age: Optional[int] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    village: Optional[str] = None
    block: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    contact_number: Optional[str] = None
    household_members: Optional[int] = None
    language_preference: str = "en"
    literacy_level: Optional[str] = None
    consent_toggles: Dict[str, Any] = Field(default_factory=dict)


class RegisterGuardian(BaseModel):
    """Guardian registration payload."""
    phone: str = Field(..., min_length=10, max_length=15)
    full_name: str = Field(..., min_length=1, max_length=255)
    guardian_type: str = Field(..., pattern="^(family|asha|ngo|anganwadi)$")
    association_id: Optional[str] = None
    region_village: Optional[str] = None
    region_block: Optional[str] = None
    region_district: Optional[str] = None
    region_state: Optional[str] = None
    organization: Optional[str] = None
    contact_number: Optional[str] = None


class RegisterDoctor(BaseModel):
    """Doctor registration payload."""
    phone: str = Field(..., min_length=10, max_length=15)
    full_name: str = Field(..., min_length=1, max_length=255)
    specialization: Optional[str] = None
    registration_number: str = Field(..., min_length=1, max_length=100)
    hospital_affiliation: Optional[str] = None
    village: Optional[str] = None
    block: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None


# --- Response Models ---

class TokenResponse(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    verification_status: str


class UserResponse(BaseModel):
    """User info response."""
    id: str
    phone: str
    role: str
    verification_status: str
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class CheckUserResponse(BaseModel):
    """Check-user response."""
    exists: bool
    user_id: Optional[str] = None


class OTPResponse(BaseModel):
    """OTP request response."""
    message: str
    otp_sent: bool
