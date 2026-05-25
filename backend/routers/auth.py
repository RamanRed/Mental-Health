"""
Auth Router — handles user registration, OTP-based login, and JWT token management.
All authentication flows: check-user, request-otp, verify-otp, register, and current user info.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import uuid4
from datetime import datetime, timedelta, timezone

from database import get_db
from models.user import User
from models.patient import PatientProfile
from models.guardian import GuardianProfile
from models.doctor import DoctorProfile
from schemas.auth import (
    CheckUserRequest, CheckUserResponse,
    OTPRequest, OTPResponse,
    OTPVerify, TokenResponse,
    RegisterPatient, RegisterGuardian, RegisterDoctor,
    UserResponse,
)
from services.auth_service import generate_otp, verify_otp, create_jwt_token
from middleware.auth_middleware import get_current_user
from config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# --- Role mapping for guardian types ---
GUARDIAN_ROLE_MAP = {
    "family": "guardian_family",
    "asha": "guardian_asha",
    "ngo": "guardian_ngo",
    "anganwadi": "guardian_anganwadi",
}


@router.post("/check-user", response_model=CheckUserResponse)
async def check_user(request: CheckUserRequest, db: AsyncSession = Depends(get_db)):
    """
    Check if a user exists by phone number and role.
    Used by frontend to determine whether to show login or registration flow.
    """
    result = await db.execute(
        select(User).where(User.phone == request.phone, User.role == request.role)
    )
    user = result.scalar_one_or_none()
    if user:
        return CheckUserResponse(exists=True, user_id=user.id)
    return CheckUserResponse(exists=False)


@router.post("/request-otp", response_model=OTPResponse)
async def request_otp(request: OTPRequest, db: AsyncSession = Depends(get_db)):
    """
    Request an OTP for phone-based authentication.
    Phase 1: OTP is always '123456'. Stores OTP in user record if user exists,
    otherwise stores temporarily (user may be registering).
    """
    otp = generate_otp()
    otp_expires = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)

    # Check if user exists
    result = await db.execute(select(User).where(User.phone == request.phone))
    user = result.scalar_one_or_none()

    if user:
        user.otp_code = otp
        user.otp_expires_at = otp_expires
        await db.commit()

    # In Phase 1, we always return success (OTP would be sent via SMS in production)
    return OTPResponse(message="OTP sent successfully", otp_sent=True)


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp_endpoint(request: OTPVerify, db: AsyncSession = Depends(get_db)):
    """
    Verify OTP and return JWT token.
    For existing users: validates OTP and returns token.
    Phase 1: accepts '123456' for any phone.
    """
    # Find user
    result = await db.execute(
        select(User).where(User.phone == request.phone, User.role == request.role)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found. Please register first.",
        )

    # Phase 1: Accept simulated OTP
    if not verify_otp(generate_otp(), request.otp):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OTP",
        )

    # Clear OTP after successful verification
    user.otp_code = None
    user.otp_expires_at = None
    await db.commit()

    # Generate JWT
    token = create_jwt_token(user.id, user.role, user.verification_status)

    return TokenResponse(
        access_token=token,
        user_id=user.id,
        role=user.role,
        verification_status=user.verification_status,
    )


@router.post("/register/patient", response_model=TokenResponse)
async def register_patient(request: RegisterPatient, db: AsyncSession = Depends(get_db)):
    """
    Register a new patient — creates both User and PatientProfile records.
    Returns JWT token upon successful registration.
    """
    # Check if phone already exists for patient role
    existing = await db.execute(
        select(User).where(User.phone == request.phone, User.role == "patient")
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this phone and role already exists",
        )

    # Check ABHA ID uniqueness if provided
    if request.abha_id:
        existing_abha = await db.execute(
            select(PatientProfile).where(PatientProfile.abha_id == request.abha_id)
        )
        if existing_abha.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Patient with this ABHA ID already exists",
            )

    user_id = str(uuid4())
    profile_id = str(uuid4())

    # Create user
    user = User(
        id=user_id,
        phone=request.phone,
        role="patient",
        verification_status="verified",  # Auto-verify on registration for Phase 1
    )
    db.add(user)

    # Create patient profile
    profile = PatientProfile(
        id=profile_id,
        user_id=user_id,
        abha_id=request.abha_id,
        full_name=request.full_name,
        age=request.age,
        date_of_birth=request.date_of_birth,
        gender=request.gender,
        village=request.village,
        block=request.block,
        district=request.district,
        state=request.state,
        contact_number=request.contact_number or request.phone,
        household_members=request.household_members,
        language_preference=request.language_preference,
        literacy_level=request.literacy_level,
        consent_toggles=request.consent_toggles,
    )
    db.add(profile)
    await db.commit()

    token = create_jwt_token(user_id, "patient", "verified")
    return TokenResponse(
        access_token=token,
        user_id=user_id,
        role="patient",
        verification_status="verified",
    )


@router.post("/register/guardian", response_model=TokenResponse)
async def register_guardian(request: RegisterGuardian, db: AsyncSession = Depends(get_db)):
    """
    Register a new guardian — creates both User and GuardianProfile records.
    Guardian types: family, asha, ngo, anganwadi.
    """
    role = GUARDIAN_ROLE_MAP.get(request.guardian_type)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid guardian type: {request.guardian_type}",
        )

    # Check if phone already exists for this guardian role
    existing = await db.execute(
        select(User).where(User.phone == request.phone, User.role == role)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this phone and role already exists",
        )

    # Check association_id uniqueness if provided
    if request.association_id:
        existing_assoc = await db.execute(
            select(GuardianProfile).where(GuardianProfile.association_id == request.association_id)
        )
        if existing_assoc.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Guardian with this association ID already exists",
            )

    user_id = str(uuid4())
    profile_id = str(uuid4())

    user = User(
        id=user_id,
        phone=request.phone,
        role=role,
        verification_status="verified",
    )
    db.add(user)

    profile = GuardianProfile(
        id=profile_id,
        user_id=user_id,
        full_name=request.full_name,
        guardian_type=request.guardian_type,
        association_id=request.association_id,
        region_village=request.region_village,
        region_block=request.region_block,
        region_district=request.region_district,
        region_state=request.region_state,
        organization=request.organization,
        contact_number=request.contact_number or request.phone,
    )
    db.add(profile)
    await db.commit()

    token = create_jwt_token(user_id, role, "verified")
    return TokenResponse(
        access_token=token,
        user_id=user_id,
        role=role,
        verification_status="verified",
    )


@router.post("/register/doctor", response_model=TokenResponse)
async def register_doctor(request: RegisterDoctor, db: AsyncSession = Depends(get_db)):
    """
    Register a new doctor — creates both User and DoctorProfile records.
    Doctors start as 'pending' verification until admin approves (Phase 1: auto-verified).
    """
    # Check if phone already exists for doctor role
    existing = await db.execute(
        select(User).where(User.phone == request.phone, User.role == "doctor")
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this phone and role already exists",
        )

    # Check registration_number uniqueness
    existing_reg = await db.execute(
        select(DoctorProfile).where(DoctorProfile.registration_number == request.registration_number)
    )
    if existing_reg.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Doctor with this registration number already exists",
        )

    user_id = str(uuid4())
    profile_id = str(uuid4())

    user = User(
        id=user_id,
        phone=request.phone,
        role="doctor",
        verification_status="verified",  # Auto-verify for Phase 1
    )
    db.add(user)

    profile = DoctorProfile(
        id=profile_id,
        user_id=user_id,
        full_name=request.full_name,
        specialization=request.specialization,
        registration_number=request.registration_number,
        hospital_affiliation=request.hospital_affiliation,
    )
    db.add(profile)
    await db.commit()

    token = create_jwt_token(user_id, "doctor", "verified")
    return TokenResponse(
        access_token=token,
        user_id=user_id,
        role="doctor",
        verification_status="verified",
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the current authenticated user's info from JWT.
    """
    result = await db.execute(select(User).where(User.id == current_user["user_id"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return UserResponse.model_validate(user)
