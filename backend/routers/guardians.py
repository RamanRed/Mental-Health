"""
Guardians Router — patient management, observation notes, questionnaire filling.
Guardians can register patients on their behalf and add notes/questionnaires.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from uuid import uuid4

from database import get_db
from models.user import User
from models.patient import PatientProfile
from models.guardian import GuardianProfile
from models.audit import GuardianNote
from models.questionnaire import QuestionnaireResponse as QuestionnaireModel
from schemas.guardian import GuardianProfileResponse, GuardianProfileUpdate
from schemas.patient import PatientProfileResponse
from schemas.auth import RegisterPatient
from schemas.questionnaire import QuestionnaireCreate, QuestionnaireResponseSchema
from schemas.consultation import ConsultationResponse
from models.consultation import Consultation
from models.screening import ScreeningResult
from middleware.auth_middleware import get_current_user, require_guardian
from typing import Optional
from services.auth_service import create_jwt_token
from math import radians, cos, sin, asin, sqrt


router = APIRouter(prefix="/api/guardians", tags=["Guardians"])


async def _attach_guardian_details(resp: PatientProfileResponse, db: AsyncSession) -> PatientProfileResponse:
    if resp.guardian1_id:
        g1_res = await db.execute(select(GuardianProfile).where(GuardianProfile.user_id == resp.guardian1_id))
        g1 = g1_res.scalar_one_or_none()
        if g1:
            resp.guardian1_name = g1.full_name
            resp.guardian1_type = g1.guardian_type
            resp.guardian1_phone = g1.contact_number
        else:
            u1_res = await db.execute(select(User).where(User.id == resp.guardian1_id))
            u1 = u1_res.scalar_one_or_none()
            if u1:
                resp.guardian1_name = f"User ({u1.phone})"
                resp.guardian1_phone = u1.phone

    if resp.guardian2_id:
        g2_res = await db.execute(select(GuardianProfile).where(GuardianProfile.user_id == resp.guardian2_id))
        g2 = g2_res.scalar_one_or_none()
        if g2:
            resp.guardian2_name = g2.full_name
            resp.guardian2_type = g2.guardian_type
            resp.guardian2_phone = g2.contact_number
        else:
            u2_res = await db.execute(select(User).where(User.id == resp.guardian2_id))
            u2 = u2_res.scalar_one_or_none()
            if u2:
                resp.guardian2_name = f"User ({u2.phone})"
                resp.guardian2_phone = u2.phone
    return resp


@router.get("/patients", response_model=list[PatientProfileResponse])
async def list_linked_patients(
    current_user: dict = Depends(require_guardian),
    db: AsyncSession = Depends(get_db),
):
    """
    List all patients linked to this guardian.
    Checks both guardian1_id and guardian2_id slots.
    """
    user_id = current_user["user_id"]
    result = await db.execute(
        select(PatientProfile).where(
            or_(
                PatientProfile.guardian1_id == user_id,
                PatientProfile.guardian2_id == user_id,
                PatientProfile.registered_by == user_id,
            )
        )
    )
    patients = result.scalars().all()
    
    response_list = []
    for p in patients:
        # Get latest risk level
        rl_res = await db.execute(
            select(ScreeningResult.risk_level)
            .where(ScreeningResult.patient_id == p.id)
            .order_by(ScreeningResult.created_at.desc())
            .limit(1)
        )
        rl = rl_res.scalar_one_or_none() or "low"
        
        resp = PatientProfileResponse.model_validate(p)
        resp.risk_level = rl
        resp = await _attach_guardian_details(resp, db)
        response_list.append(resp)
        
    return response_list



@router.post("/register-patient", response_model=PatientProfileResponse)
async def register_patient_on_behalf(
    request: RegisterPatient,
    current_user: dict = Depends(require_guardian),
    db: AsyncSession = Depends(get_db),
):
    """
    Register a patient on behalf of the guardian.
    Creates a User + PatientProfile, and links the guardian.
    """
    # Check if phone already exists for patient role
    existing = await db.execute(
        select(User).where(User.phone == request.phone, User.role == "patient")
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Patient with this phone already exists",
        )

    # Check ABHA ID uniqueness
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

    # Create patient user
    user = User(
        id=user_id,
        phone=request.phone,
        role="patient",
        verification_status="verified",
    )
    db.add(user)

    # Create patient profile with guardian link
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
        guardian1_id=current_user["user_id"],
        registered_by=current_user["user_id"],
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)

    resp = PatientProfileResponse.model_validate(profile)
    return await _attach_guardian_details(resp, db)


@router.post("/notes")
async def add_guardian_note(
    patient_id: str,
    note_text: str,
    note_type: str = "observation",
    current_user: dict = Depends(require_guardian),
    db: AsyncSession = Depends(get_db),
):
    """
    Add an observation note about a linked patient.
    Note types: observation, check_in, concern.
    """
    # Verify patient is linked to this guardian
    user_id = current_user["user_id"]
    result = await db.execute(
        select(PatientProfile).where(
            PatientProfile.id == patient_id,
            or_(
                PatientProfile.guardian1_id == user_id,
                PatientProfile.guardian2_id == user_id,
                PatientProfile.registered_by == user_id,
            ),
        )
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient not linked to this guardian",
        )

    if note_type not in ("observation", "check_in", "concern"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="note_type must be one of: observation, check_in, concern",
        )

    note = GuardianNote(
        id=str(uuid4()),
        patient_id=patient_id,
        guardian_id=user_id,
        note_text=note_text,
        note_type=note_type,
    )
    db.add(note)
    await db.commit()

    return {
        "message": "Note added successfully",
        "note_id": note.id,
        "patient_id": patient_id,
        "note_type": note_type,
    }


@router.post("/questionnaire", response_model=QuestionnaireResponseSchema)
async def fill_questionnaire_on_behalf(
    questionnaire: QuestionnaireCreate,
    current_user: dict = Depends(require_guardian),
    db: AsyncSession = Depends(get_db),
):
    """
    Fill a questionnaire on behalf of a linked patient.
    """
    # Verify patient is linked
    user_id = current_user["user_id"]
    result = await db.execute(
        select(PatientProfile).where(
            PatientProfile.id == questionnaire.patient_id,
            or_(
                PatientProfile.guardian1_id == user_id,
                PatientProfile.guardian2_id == user_id,
                PatientProfile.registered_by == user_id,
            ),
        )
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient not linked to this guardian",
        )

    response = QuestionnaireModel(
        id=str(uuid4()),
        patient_id=questionnaire.patient_id,
        filled_by=user_id,
        domain=questionnaire.domain,
        questions=questionnaire.questions,
        completed=questionnaire.completed,
    )
    db.add(response)
    await db.commit()
    await db.refresh(response)

    return QuestionnaireResponseSchema.model_validate(response)


@router.get("/profile", response_model=GuardianProfileResponse)
async def get_guardian_profile(
    current_user: dict = Depends(require_guardian),
    db: AsyncSession = Depends(get_db),
):
    """Get the authenticated guardian's own profile."""
    result = await db.execute(
        select(GuardianProfile).where(GuardianProfile.user_id == current_user["user_id"])
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guardian profile not found",
        )
    return GuardianProfileResponse.model_validate(profile)


@router.put("/profile", response_model=GuardianProfileResponse)
async def update_guardian_profile(
    updates: GuardianProfileUpdate,
    current_user: dict = Depends(require_guardian),
    db: AsyncSession = Depends(get_db),
):
    """Update the authenticated guardian's profile."""
    result = await db.execute(
        select(GuardianProfile).where(GuardianProfile.user_id == current_user["user_id"])
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guardian profile not found",
        )
        
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
        
    await db.commit()
    await db.refresh(profile)
    return GuardianProfileResponse.model_validate(profile)


@router.get("/nearby-patients", response_model=list[PatientProfileResponse])
async def get_nearby_patients(
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius_km: float = 10.0,
    current_user: dict = Depends(require_guardian),
    db: AsyncSession = Depends(get_db),
):
    """
    Find patients registered in the system within a certain radius (default 10 km).
    If coordinates are not provided, it falls back to the guardian's profile location.
    """
    target_lat = latitude
    target_lng = longitude
    
    if target_lat is None or target_lng is None:
        result = await db.execute(
            select(GuardianProfile).where(GuardianProfile.user_id == current_user["user_id"])
        )
        guardian = result.scalar_one_or_none()
        if guardian and guardian.latitude is not None and guardian.longitude is not None:
            target_lat = guardian.latitude
            target_lng = guardian.longitude
            
    if target_lat is None or target_lng is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Latitude and longitude coordinates are required to query nearby patients.",
        )
        
    def calculate_haversine(lon1, lat1, lon2, lat2):
        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        r = 6371
        return c * r
        
    # Bounding box filter (rough coordinates)
    lat_range = radius_km / 111.0
    lng_range = radius_km / (111.0 * cos(radians(target_lat)))
    
    min_lat = target_lat - lat_range
    max_lat = target_lat + lat_range
    min_lng = target_lng - lng_range
    max_lng = target_lng + lng_range
    
    p_result = await db.execute(
        select(PatientProfile).where(
            PatientProfile.latitude >= min_lat,
            PatientProfile.latitude <= max_lat,
            PatientProfile.longitude >= min_lng,
            PatientProfile.longitude <= max_lng,
        )
    )
    patients = p_result.scalars().all()
    
    nearby_patients = []
    for p in patients:
        dist = calculate_haversine(target_lng, target_lat, p.longitude, p.latitude)
        if dist <= radius_km:
            rl_res = await db.execute(
                select(ScreeningResult.risk_level)
                .where(ScreeningResult.patient_id == p.id)
                .order_by(ScreeningResult.created_at.desc())
                .limit(1)
            )
            rl = rl_res.scalar_one_or_none() or "low"
            
            resp = PatientProfileResponse.model_validate(p)
            resp.risk_level = rl
            resp.distance_km = round(dist, 2)
            resp = await _attach_guardian_details(resp, db)
            nearby_patients.append(resp)
            
    return nearby_patients


@router.get("/patients/{patient_id}/consultations", response_model=list[ConsultationResponse])
async def get_linked_patient_consultations(
    patient_id: str,
    current_user: dict = Depends(require_guardian),
    db: AsyncSession = Depends(get_db),
):
    """
    Get consultation records of a linked patient, subject to access controls.
    Requires patient consent (in consent_toggles) and doctor-granted consultation access.
    """
    guardian_user_id = current_user["user_id"]
    
    # 1. Fetch Patient
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.id == patient_id)
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found.",
        )
        
    # 2. Check if linked to this guardian
    is_guardian1 = (patient.guardian1_id == guardian_user_id)
    is_guardian2 = (patient.guardian2_id == guardian_user_id)
    is_registrant = (patient.registered_by == guardian_user_id)
    
    if not (is_guardian1 or is_guardian2 or is_registrant):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Patient is not linked to your guardian account.",
        )
        
    # 3. Check Patient Consent Toggles
    consent = patient.consent_toggles or {}
    patient_allows = False
    
    # If guardian registered the patient (e.g. illiterate patient), they have administrative linkage.
    # Otherwise, check explicit consent flags.
    if is_registrant and patient.literacy_level == "illiterate":
        patient_allows = True
    elif is_guardian1:
        patient_allows = consent.get("guardian1_consults", False)
    elif is_guardian2:
        patient_allows = consent.get("guardian2_consults", False) or consent.get("guardian2_basic_view", False)
        
    if not patient_allows:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Patient consent has not been granted for viewing consultation history.",
        )
        
    # 4. Fetch Consultations matching doctor-granted access
    if is_guardian1:
        c_result = await db.execute(
            select(Consultation)
            .where(Consultation.patient_id == patient_id, Consultation.guardian1_access == True)
            .order_by(Consultation.created_at.desc())
        )
    else:
        c_result = await db.execute(
            select(Consultation)
            .where(Consultation.patient_id == patient_id, Consultation.guardian2_access == True)
            .order_by(Consultation.created_at.desc())
        )
        
    consultations = c_result.scalars().all()
    return [ConsultationResponse.model_validate(c) for c in consultations]

