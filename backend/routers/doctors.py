"""
Doctors Router — patient queue, AI briefs, session management, form validation, and summaries.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import uuid4

from database import get_db
from models.patient import PatientProfile
from models.doctor import DoctorProfile
from models.consultation import Consultation
from models.screening import ScreeningResult
from schemas.doctor import DoctorProfileResponse, DoctorProfileUpdate
from schemas.patient import PatientProfileResponse
from schemas.consultation import (
    ConsultationCreate,
    ConsultationResponse,
    ConsultationUpdate,
    ConsultationFormUpdate,
    ConsultationSummaryUpdate,
    ConsultationAccessUpdate,
)
from middleware.auth_middleware import get_current_user, require_doctor
from services.screening_service import run_screening
from models.audit import GuardianNote
from models.guardian import GuardianProfile
from models.user import User
from schemas.guardian import GuardianNoteResponse

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])


async def _get_doctor_profile(user_id: str, db: AsyncSession) -> DoctorProfile:
    """Helper to get doctor profile or raise 404."""
    result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found",
        )
    return profile


async def _to_consultation_response(c: Consultation, db: AsyncSession) -> ConsultationResponse:
    """Helper to convert Consultation to ConsultationResponse with patient/doctor details."""
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



@router.get("/patients", response_model=list[PatientProfileResponse])
async def get_patient_queue(
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the doctor's patient queue — all patients with consultations assigned to this doctor.
    """
    doctor = await _get_doctor_profile(current_user["user_id"], db)

    # Get unique patient IDs from consultations
    result = await db.execute(
        select(Consultation.patient_id)
        .where(Consultation.doctor_id == doctor.id)
        .distinct()
    )
    patient_ids = [row[0] for row in result.all()]

    if not patient_ids:
        return []

    result = await db.execute(
        select(PatientProfile).where(PatientProfile.id.in_(patient_ids))
    )
    patients = result.scalars().all()
    
    patients_list = []
    for p in patients:
        # Check consultations for this doctor and patient
        c_res = await db.execute(
            select(Consultation)
            .where(Consultation.patient_id == p.id, Consultation.doctor_id == doctor.id)
        )
        cons = c_res.scalars().all()
        
        has_completed = any(c.status == "completed" for c in cons)
        has_active = any(c.status in ("scheduled", "in_progress") for c in cons)
        
        is_treated = has_completed and not has_active
        
        resp = PatientProfileResponse.model_validate(p)
        resp.is_treated = is_treated
        patients_list.append(resp)
        
    return patients_list


@router.get("/patient/{patient_id}/brief")
async def get_patient_brief(
    patient_id: str,
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a pre-consultation AI brief for a patient.
    Runs the screening stub to generate a risk assessment summary.
    """
    # Verify patient exists
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.id == patient_id)
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )

    # Run screening analysis
    screening = await run_screening(patient_id, db)

    # Save screening result
    sr = ScreeningResult(
        id=screening["id"],
        patient_id=patient_id,
        risk_level=screening["risk_level"],
        contributing_factors=screening["contributing_factors"],
        plain_language_summary=screening["plain_language_summary"],
        trigger_type="pre_consultation",
        reviewed_by_doctor=False,
    )
    db.add(sr)
    await db.commit()

    return {
        "patient": PatientProfileResponse.model_validate(patient),
        "screening": screening,
    }


@router.get("/patient/{patient_id}/consultations", response_model=list[ConsultationResponse])
async def get_patient_past_consultations(
    patient_id: str,
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all past consultations/sessions for a specific patient.
    """
    # Verify patient exists
    p_res = await db.execute(select(PatientProfile).where(PatientProfile.id == patient_id))
    patient = p_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )

    result = await db.execute(
        select(Consultation)
        .where(Consultation.patient_id == patient_id)
        .order_by(Consultation.scheduled_at.desc())
    )
    consultations = result.scalars().all()
    return [await _to_consultation_response(c, db) for c in consultations]


@router.get("/patient/{patient_id}/guardian-notes", response_model=list[GuardianNoteResponse])
async def get_patient_guardian_notes(
    patient_id: str,
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all observational notes recorded by guardians for a specific patient.
    """
    # Verify patient exists
    p_res = await db.execute(select(PatientProfile).where(PatientProfile.id == patient_id))
    patient = p_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )

    result = await db.execute(
        select(GuardianNote)
        .where(GuardianNote.patient_id == patient_id)
        .order_by(GuardianNote.created_at.desc())
    )
    notes = result.scalars().all()

    response_list = []
    for note in notes:
        # Find guardian name
        guardian_name = "Unknown Guardian"
        g_res = await db.execute(select(GuardianProfile).where(GuardianProfile.user_id == note.guardian_id))
        g = g_res.scalar_one_or_none()
        if g:
            guardian_name = g.full_name
        else:
            u_res = await db.execute(select(User).where(User.id == note.guardian_id))
            u = u_res.scalar_one_or_none()
            if u:
                guardian_name = f"ASHA/Guardian ({u.phone})"
        
        resp = GuardianNoteResponse.model_validate(note)
        resp.guardian_name = guardian_name
        response_list.append(resp)

    return response_list





@router.post("/sessions", response_model=ConsultationResponse)
async def create_session(
    session: ConsultationCreate,
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Create/schedule a new consultation session."""
    doctor = await _get_doctor_profile(current_user["user_id"], db)

    # Verify patient exists
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.id == session.patient_id)
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )

    consultation = Consultation(
        id=str(uuid4()),
        patient_id=session.patient_id,
        doctor_id=doctor.id,
        session_number=session.session_number,
        session_type=session.session_type,
        format=session.format,
        status="scheduled",
        scheduled_at=session.scheduled_at,
        clinical_form_id=session.clinical_form_id,
    )
    db.add(consultation)
    
    # Send notification to patient
    from services.notification_service import create_notification
    try:
      formatted_time = session.scheduled_at.strftime('%Y-%m-%d %H:%M') if session.scheduled_at else "TBD"
      is_followup = "follow_up" in session.session_type
      title = "Follow-Up Consultation Scheduled" if is_followup else "New Consultation Session"
      content = (
          f"A follow-up review session #{session.session_number} has been scheduled with Dr. {doctor.full_name} for {formatted_time}. Please ensure you attend this review."
          if is_followup else
          f"Session #{session.session_number} ({session.session_type.replace('_', ' ')}) has been scheduled with Dr. {doctor.full_name} for {formatted_time}."
      )
      await create_notification(
          user_id=patient.user_id,
          title=title,
          content=content,
          notification_type="session_scheduled",
          db=db
      )
    except Exception as e:
      print(f"Failed to send session notification: {str(e)}")

    await db.commit()
    await db.refresh(consultation)

    return await _to_consultation_response(consultation, db)


@router.put("/sessions/{session_id}", response_model=ConsultationResponse)
async def update_session(
    session_id: str,
    updates: ConsultationUpdate,
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Update session status and other fields."""
    result = await db.execute(
        select(Consultation).where(Consultation.id == session_id)
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found",
        )

    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(consultation, field, value)

    await db.commit()
    await db.refresh(consultation)
    return await _to_consultation_response(consultation, db)


@router.put("/sessions/{session_id}/form", response_model=ConsultationResponse)
async def validate_form(
    session_id: str,
    form: ConsultationFormUpdate,
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """
    Doctor validates and saves the AI-filled form.
    Stores in doctor_validated_form field.
    """
    result = await db.execute(
        select(Consultation).where(Consultation.id == session_id)
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found",
        )

    consultation.doctor_validated_form = form.doctor_validated_form
    await db.commit()
    await db.refresh(consultation)
    return await _to_consultation_response(consultation, db)


@router.put("/sessions/{session_id}/summary", response_model=ConsultationResponse)
async def edit_summary(
    session_id: str,
    summary: ConsultationSummaryUpdate,
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Edit the consultation summary."""
    result = await db.execute(
        select(Consultation).where(Consultation.id == session_id)
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found",
        )

    consultation.consultation_summary = summary.consultation_summary
    await db.commit()
    await db.refresh(consultation)
    return await _to_consultation_response(consultation, db)


@router.put("/sessions/{session_id}/access", response_model=ConsultationResponse)
async def set_guardian_access(
    session_id: str,
    access: ConsultationAccessUpdate,
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Set guardian access permissions for a consultation."""
    result = await db.execute(
        select(Consultation).where(Consultation.id == session_id)
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found",
        )

    if access.guardian1_access is not None:
        consultation.guardian1_access = access.guardian1_access
    if access.guardian2_access is not None:
        consultation.guardian2_access = access.guardian2_access
    if access.access_expiry is not None:
        consultation.access_expiry = access.access_expiry

    await db.commit()
    await db.refresh(consultation)
    return await _to_consultation_response(consultation, db)


@router.get("/sessions", response_model=list[ConsultationResponse])
async def list_doctor_sessions(
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """List all consultations/sessions scheduled with this doctor."""
    doctor = await _get_doctor_profile(current_user["user_id"], db)
    result = await db.execute(
        select(Consultation)
        .where(Consultation.doctor_id == doctor.id)
        .order_by(Consultation.scheduled_at.desc())
    )
    consultations = result.scalars().all()
    return [await _to_consultation_response(c, db) for c in consultations]


@router.get("/sessions/{session_id}", response_model=ConsultationResponse)
async def get_session_details(
    session_id: str,
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Get the details of a specific consultation session."""
    doctor = await _get_doctor_profile(current_user["user_id"], db)
    result = await db.execute(
        select(Consultation).where(
            Consultation.id == session_id,
            Consultation.doctor_id == doctor.id
        )
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found or not assigned to this doctor",
        )
    return await _to_consultation_response(consultation, db)


@router.get("/profile", response_model=DoctorProfileResponse)
async def get_doctor_profile(
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Get the authenticated doctor's own profile."""
    profile = await _get_doctor_profile(current_user["user_id"], db)
    return DoctorProfileResponse.model_validate(profile)


@router.put("/profile", response_model=DoctorProfileResponse)
async def update_doctor_profile(
    updates: DoctorProfileUpdate,
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Update the authenticated doctor's profile fields."""
    profile = await _get_doctor_profile(current_user["user_id"], db)

    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return DoctorProfileResponse.model_validate(profile)


from models.clinical_form import ClinicalForm
from schemas.clinical_form import ClinicalFormResponse


@router.get("/clinical-forms", response_model=list[ClinicalFormResponse])
async def list_clinical_forms(
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """List all active clinical form templates."""
    result = await db.execute(
        select(ClinicalForm).where(ClinicalForm.is_active == True)
    )
    forms = result.scalars().all()
    return [ClinicalFormResponse.model_validate(f) for f in forms]


@router.get("/clinical-forms/{form_id}", response_model=ClinicalFormResponse)
async def get_clinical_form_details(
    form_id: str,
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific clinical form template definition."""
    result = await db.execute(
        select(ClinicalForm).where(ClinicalForm.id == form_id)
    )
    form = result.scalar_one_or_none()
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clinical form template not found"
        )
    return ClinicalFormResponse.model_validate(form)

