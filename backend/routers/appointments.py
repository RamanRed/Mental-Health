"""
Appointments Router — manages patient-initiated appointment requests and doctor approvals.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import uuid4
from datetime import datetime, timezone

from database import get_db
from models.user import User
from models.patient import PatientProfile
from models.doctor import DoctorProfile
from models.appointment import Appointment
from models.consultation import Consultation
from schemas.appointment import AppointmentCreate, AppointmentAccept, AppointmentReject, AppointmentResponse
from schemas.doctor import DoctorProfileResponse
from middleware.auth_middleware import get_current_user, require_patient, require_doctor
from services.notification_service import create_notification

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])


async def _get_patient_profile(user_id: str, db: AsyncSession) -> PatientProfile:
    """Helper to get patient profile or raise 404."""
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found",
        )
    return profile


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


@router.get("/available-doctors", response_model=list[DoctorProfileResponse])
async def list_available_doctors(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all registered doctors in the system.
    """
    result = await db.execute(
        select(DoctorProfile).order_by(DoctorProfile.full_name)
    )
    doctors = result.scalars().all()
    return [DoctorProfileResponse.model_validate(d) for d in doctors]


@router.post("/request", response_model=AppointmentResponse)
async def request_appointment(
    req: AppointmentCreate,
    current_user: dict = Depends(require_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Patient requests a new appointment with a doctor.
    """
    patient = await _get_patient_profile(current_user["user_id"], db)

    # Verify doctor exists
    result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.id == req.doctor_id)
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found",
        )

    # Create appointment
    appt = Appointment(
        id=str(uuid4()),
        patient_id=patient.id,
        doctor_id=req.doctor_id,
        preferred_date=req.preferred_date,
        urgency=req.urgency,
        status="pending",
        patient_notes=req.patient_notes,
    )
    db.add(appt)

    # Create notification for doctor
    try:
        await create_notification(
            user_id=doctor.user_id,
            title="New Appointment Request",
            content=f"Patient {patient.full_name} requested a {req.urgency} appointment for {req.preferred_date.strftime('%Y-%m-%d %H:%M')}.",
            notification_type="appointment_request",
            db=db,
        )
    except Exception as e:
        print(f"Failed to create notification for doctor: {str(e)}")

    await db.commit()
    await db.refresh(appt)

    resp = AppointmentResponse.model_validate(appt)
    resp.patient_name = patient.full_name
    resp.doctor_name = doctor.full_name
    return resp


@router.get("/my", response_model=list[AppointmentResponse])
async def get_my_appointments(
    current_user: dict = Depends(require_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Patient views all their requested appointments.
    """
    patient = await _get_patient_profile(current_user["user_id"], db)

    result = await db.execute(
        select(Appointment)
        .where(Appointment.patient_id == patient.id)
        .order_by(Appointment.created_at.desc())
    )
    appts = result.scalars().all()

    response_list = []
    for appt in appts:
        # Get doctor name
        doc_result = await db.execute(
            select(DoctorProfile.full_name).where(DoctorProfile.id == appt.doctor_id)
        )
        doctor_name = doc_result.scalar_one_or_none()

        resp = AppointmentResponse.model_validate(appt)
        resp.patient_name = patient.full_name
        resp.doctor_name = doctor_name
        response_list.append(resp)

    return response_list


@router.get("/doctor/pending", response_model=list[AppointmentResponse])
async def get_doctor_pending_appointments(
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """
    Doctor views all pending appointment requests.
    """
    doctor = await _get_doctor_profile(current_user["user_id"], db)

    result = await db.execute(
        select(Appointment)
        .where(Appointment.doctor_id == doctor.id, Appointment.status == "pending")
        .order_by(Appointment.created_at.desc())
    )
    appts = result.scalars().all()

    response_list = []
    for appt in appts:
        # Get patient name
        pat_result = await db.execute(
            select(PatientProfile.full_name).where(PatientProfile.id == appt.patient_id)
        )
        patient_name = pat_result.scalar_one_or_none()

        resp = AppointmentResponse.model_validate(appt)
        resp.patient_name = patient_name
        resp.doctor_name = doctor.full_name
        response_list.append(resp)

    return response_list


@router.put("/{appointment_id}/cancel", response_model=AppointmentResponse)
async def cancel_appointment(
    appointment_id: str,
    current_user: dict = Depends(require_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Patient cancels their own pending appointment request.
    """
    patient = await _get_patient_profile(current_user["user_id"], db)

    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id, Appointment.patient_id == patient.id
        )
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found or not owned by you",
        )

    if appt.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel an appointment in {appt.status} status",
        )

    appt.status = "cancelled"
    await db.commit()
    await db.refresh(appt)

    # Get doctor name
    doc_result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.id == appt.doctor_id)
    )
    doctor = doc_result.scalar_one_or_none()

    # Notify doctor of cancellation
    if doctor:
        try:
            await create_notification(
                user_id=doctor.user_id,
                title="Appointment Cancelled",
                content=f"Patient {patient.full_name} cancelled their appointment request for {appt.preferred_date.strftime('%Y-%m-%d %H:%M')}.",
                notification_type="appointment_cancelled",
                db=db,
            )
        except Exception as e:
            print(f"Failed to create notification: {str(e)}")

    resp = AppointmentResponse.model_validate(appt)
    resp.patient_name = patient.full_name
    resp.doctor_name = doctor.full_name if doctor else None
    return resp


@router.put("/{appointment_id}/accept", response_model=AppointmentResponse)
async def accept_appointment(
    appointment_id: str,
    accept_data: AppointmentAccept,
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """
    Doctor accepts an appointment request. This automatically schedules a Consultation session.
    """
    doctor = await _get_doctor_profile(current_user["user_id"], db)

    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id, Appointment.doctor_id == doctor.id
        )
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment request not found",
        )

    if appt.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot accept an appointment in {appt.status} status",
        )

    appt.status = "accepted"

    # Get patient profile and user info
    pat_result = await db.execute(
        select(PatientProfile).where(PatientProfile.id == appt.patient_id)
    )
    patient = pat_result.scalar_one_or_none()

    # Find the next session number for this patient
    sess_result = await db.execute(
        select(Consultation.session_number)
        .where(Consultation.patient_id == appt.patient_id)
        .order_by(Consultation.session_number.desc())
        .limit(1)
    )
    last_session_num = sess_result.scalar_one_or_none() or 0
    next_session_num = last_session_num + 1

    # Create Consultation
    consultation = Consultation(
        id=str(uuid4()),
        patient_id=appt.patient_id,
        doctor_id=doctor.id,
        session_number=next_session_num,
        session_type=accept_data.session_type,
        format=accept_data.format,
        status="scheduled",
        scheduled_at=appt.preferred_date,
        clinical_form_id=accept_data.clinical_form_id,
    )
    db.add(consultation)

    # Notify patient
    if patient:
        try:
            await create_notification(
                user_id=patient.user_id,
                title="Appointment Accepted",
                content=f"Dr. {doctor.full_name} accepted your appointment request for {appt.preferred_date.strftime('%Y-%m-%d %H:%M')}. A consultation has been scheduled.",
                notification_type="appointment_accepted",
                db=db,
            )
        except Exception as e:
            print(f"Failed to create notification: {str(e)}")

    await db.commit()
    await db.refresh(appt)

    resp = AppointmentResponse.model_validate(appt)
    resp.patient_name = patient.full_name if patient else None
    resp.doctor_name = doctor.full_name
    return resp


@router.put("/{appointment_id}/reject", response_model=AppointmentResponse)
async def reject_appointment(
    appointment_id: str,
    reject_data: AppointmentReject,
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """
    Doctor rejects an appointment request with a reason.
    """
    doctor = await _get_doctor_profile(current_user["user_id"], db)

    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id, Appointment.doctor_id == doctor.id
        )
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment request not found",
        )

    if appt.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject an appointment in {appt.status} status",
        )

    appt.status = "rejected"
    appt.rejection_reason = reject_data.rejection_reason

    # Get patient details
    pat_result = await db.execute(
        select(PatientProfile).where(PatientProfile.id == appt.patient_id)
    )
    patient = pat_result.scalar_one_or_none()

    # Notify patient
    if patient:
        try:
            await create_notification(
                user_id=patient.user_id,
                title="Appointment Declined",
                content=f"Dr. {doctor.full_name} declined your appointment request. Reason: {reject_data.rejection_reason}",
                notification_type="appointment_rejected",
                db=db,
            )
        except Exception as e:
            print(f"Failed to create notification: {str(e)}")

    await db.commit()
    await db.refresh(appt)

    resp = AppointmentResponse.model_validate(appt)
    resp.patient_name = patient.full_name if patient else None
    resp.doctor_name = doctor.full_name
    return resp
