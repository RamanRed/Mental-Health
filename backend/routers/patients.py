"""
Patients Router — patient profile management, consultations, consent, and guardian linking.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from database import get_db
from models.user import User
from models.patient import PatientProfile
from models.doctor import DoctorProfile
from models.consultation import Consultation
from models.audit import ConsentAuditLog
from schemas.patient import (
    PatientProfileResponse,
    PatientProfileUpdate,
    ConsentUpdate,
    LinkGuardianRequest,
)
from schemas.consultation import ConsultationResponse
from middleware.auth_middleware import get_current_user, require_patient
from uuid import uuid4

router = APIRouter(prefix="/api/patients", tags=["Patients"])


@router.get("/profile", response_model=PatientProfileResponse)
async def get_profile(
    current_user: dict = Depends(require_patient),
    db: AsyncSession = Depends(get_db),
):
    """Get the authenticated patient's own profile."""
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.user_id == current_user["user_id"])
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found",
        )
    return PatientProfileResponse.model_validate(profile)


@router.put("/profile", response_model=PatientProfileResponse)
async def update_profile(
    updates: PatientProfileUpdate,
    current_user: dict = Depends(require_patient),
    db: AsyncSession = Depends(get_db),
):
    """Update the authenticated patient's profile fields."""
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.user_id == current_user["user_id"])
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found",
        )

    # Apply only provided fields
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return PatientProfileResponse.model_validate(profile)


async def _to_consultation_response(c: Consultation, db: AsyncSession) -> ConsultationResponse:
    p_res = await db.execute(select(PatientProfile).where(PatientProfile.id == c.patient_id))
    p = p_res.scalar_one_or_none()
    d_res = await db.execute(select(DoctorProfile).where(DoctorProfile.id == c.doctor_id))
    d = d_res.scalar_one_or_none()
    resp = ConsultationResponse.model_validate(c)
    if p:
        resp.patient_user_id = p.user_id
        resp.patient_name = p.full_name
    if d:
        resp.doctor_user_id = d.user_id
        resp.doctor_name = d.full_name
    return resp


@router.get("/consultations", response_model=list[ConsultationResponse])
async def get_consultations(
    current_user: dict = Depends(require_patient),
    db: AsyncSession = Depends(get_db),
):
    """Get all consultations for the authenticated patient."""
    # Get patient profile
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.user_id == current_user["user_id"])
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found",
        )

    result = await db.execute(
        select(Consultation)
        .where(Consultation.patient_id == profile.id)
        .order_by(Consultation.created_at.desc())
    )
    consultations = result.scalars().all()
    return [await _to_consultation_response(c, db) for c in consultations]


@router.put("/consent", response_model=PatientProfileResponse)
async def update_consent(
    consent: ConsentUpdate,
    current_user: dict = Depends(require_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Update consent toggles for the patient.
    Also creates an audit log entry for transparency.
    """
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.user_id == current_user["user_id"])
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found",
        )

    # Update consent toggles
    profile.consent_toggles = consent.consent_toggles
    
    # Create audit log
    audit = ConsentAuditLog(
        id=str(uuid4()),
        patient_id=profile.id,
        action="consent_updated",
        granted_by=current_user["user_id"],
        details={"new_toggles": consent.consent_toggles},
    )
    db.add(audit)

    await db.commit()
    await db.refresh(profile)
    return PatientProfileResponse.model_validate(profile)


@router.post("/link-guardian")
async def link_guardian(
    request: LinkGuardianRequest,
    current_user: dict = Depends(require_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Link a guardian to this patient by the guardian's phone number.
    Assigns to guardian1 or guardian2 slot.
    """
    # Get patient profile
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.user_id == current_user["user_id"])
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found",
        )

    # Find guardian user by phone
    result = await db.execute(
        select(User).where(
            User.phone == request.guardian_phone,
            User.role.like("guardian_%"),
        )
    )
    guardian_user = result.scalar_one_or_none()
    if not guardian_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guardian with this phone not found",
        )

    # Link to appropriate slot
    if request.slot == "guardian1":
        profile.guardian1_id = guardian_user.id
    else:
        profile.guardian2_id = guardian_user.id

    await db.commit()

    return {
        "message": f"Guardian linked to {request.slot} successfully",
        "guardian_id": guardian_user.id,
        "slot": request.slot,
    }
