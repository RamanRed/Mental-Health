"""
Follow Requests Router — doctors send follow-up check-in requests to patients;
patients acknowledge and respond between consultation sessions.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import uuid4
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models.follow_request import DoctorFollowRequest
from models.doctor import DoctorProfile
from models.patient import PatientProfile
from middleware.auth_middleware import get_current_user, require_doctor, require_patient
from services.notification_service import create_notification

router = APIRouter(prefix="/api/follow-requests", tags=["Follow Requests"])


# ── Schemas (inline) ─────────────────────────────────────────────────────────

class FollowRequestCreate(BaseModel):
    patient_id: str
    consultation_id: Optional[str] = None
    message: Optional[str] = None
    due_date: Optional[datetime] = None
    notify_guardian: Optional[bool] = False


class FollowRequestRespond(BaseModel):
    patient_response: str


class FollowRequestResponse(BaseModel):
    id: str
    doctor_id: str
    patient_id: str
    consultation_id: Optional[str] = None
    message: Optional[str] = None
    status: str
    patient_response: Optional[str] = None
    due_date: Optional[str] = None
    responded_at: Optional[str] = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _to_response(r: DoctorFollowRequest) -> FollowRequestResponse:
    return FollowRequestResponse(
        id=r.id,
        doctor_id=r.doctor_id,
        patient_id=r.patient_id,
        consultation_id=r.consultation_id,
        message=r.message,
        status=r.status,
        patient_response=r.patient_response,
        due_date=r.due_date.isoformat() if r.due_date else None,
        responded_at=r.responded_at.isoformat() if r.responded_at else None,
        created_at=r.created_at.isoformat(),
        updated_at=r.updated_at.isoformat(),
    )


# ── Doctor Endpoints ─────────────────────────────────────────────────────────

@router.post("", response_model=FollowRequestResponse)
async def create_follow_request(
    payload: FollowRequestCreate,
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """
    Doctor sends a follow-up check-in request to a patient.
    The patient receives an in-app notification.
    """
    # Get doctor profile
    dr_res = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == current_user["user_id"]))
    doctor = dr_res.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    # Verify patient exists
    pt_res = await db.execute(select(PatientProfile).where(PatientProfile.id == payload.patient_id))
    patient = pt_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    follow_req = DoctorFollowRequest(
        id=str(uuid4()),
        doctor_id=doctor.id,
        patient_id=payload.patient_id,
        consultation_id=payload.consultation_id,
        message=payload.message,
        status="pending",
        due_date=payload.due_date,
    )
    db.add(follow_req)

    # Notify patient
    try:
        due_str = payload.due_date.strftime("%Y-%m-%d") if payload.due_date else "soon"
        await create_notification(
            user_id=patient.user_id,
            title="Follow-Up Check-In Requested",
            content=(
                f"Dr. {doctor.full_name} has sent you a follow-up request. "
                f"Please respond by {due_str}. "
                + (f'Message: "{payload.message}"' if payload.message else "")
            ).strip(),
            notification_type="follow_request",
            db=db,
        )
    except Exception as e:
        print(f"Failed to send follow-up notification: {e}")

    # Notify guardians if requested by doctor
    if payload.notify_guardian:
        if patient.guardian1_id:
            try:
                await create_notification(
                    user_id=patient.guardian1_id,
                    title=f"Patient Follow-Up Alert: {patient.full_name}",
                    content=(
                        f"Dr. {doctor.full_name} has sent a follow-up check-in request to your linked patient, {patient.full_name}. "
                        + (f'Instructions: "{payload.message}"' if payload.message else "")
                    ).strip(),
                    notification_type="guardian_follow_alert",
                    db=db,
                )
            except Exception as e:
                print(f"Failed to notify Guardian 1: {e}")

        if patient.guardian2_id:
            try:
                await create_notification(
                    user_id=patient.guardian2_id,
                    title=f"ASHA Worker Follow-Up Alert: {patient.full_name}",
                    content=(
                        f"Dr. {doctor.full_name} has sent a follow-up request to {patient.full_name}. "
                        f"Please coordinate check-in. "
                        + (f'Instructions: "{payload.message}"' if payload.message else "")
                    ).strip(),
                    notification_type="asha_follow_alert",
                    db=db,
                )
            except Exception as e:
                print(f"Failed to notify Guardian 2 (ASHA): {e}")

    await db.commit()
    await db.refresh(follow_req)
    return _to_response(follow_req)


@router.get("/sent", response_model=list[FollowRequestResponse])
async def get_sent_follow_requests(
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all follow-up requests sent by this doctor.
    """
    dr_res = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == current_user["user_id"]))
    doctor = dr_res.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    result = await db.execute(
        select(DoctorFollowRequest)
        .where(DoctorFollowRequest.doctor_id == doctor.id)
        .order_by(DoctorFollowRequest.created_at.desc())
    )
    return [_to_response(r) for r in result.scalars().all()]


# ── Patient Endpoints ─────────────────────────────────────────────────────────

@router.get("/my", response_model=list[FollowRequestResponse])
async def get_my_follow_requests(
    current_user: dict = Depends(require_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Patient: get all follow-up requests assigned to me.
    """
    pt_res = await db.execute(select(PatientProfile).where(PatientProfile.user_id == current_user["user_id"]))
    patient = pt_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    result = await db.execute(
        select(DoctorFollowRequest)
        .where(DoctorFollowRequest.patient_id == patient.id)
        .order_by(DoctorFollowRequest.created_at.desc())
    )
    return [_to_response(r) for r in result.scalars().all()]


@router.put("/{request_id}/respond", response_model=FollowRequestResponse)
async def respond_to_follow_request(
    request_id: str,
    payload: FollowRequestRespond,
    current_user: dict = Depends(require_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Patient responds to a follow-up request.
    Status changes to 'responded' and doctor is notified.
    """
    pt_res = await db.execute(select(PatientProfile).where(PatientProfile.user_id == current_user["user_id"]))
    patient = pt_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    result = await db.execute(
        select(DoctorFollowRequest).where(
            DoctorFollowRequest.id == request_id,
            DoctorFollowRequest.patient_id == patient.id,
        )
    )
    follow_req = result.scalar_one_or_none()
    if not follow_req:
        raise HTTPException(status_code=404, detail="Follow-up request not found")

    follow_req.patient_response = payload.patient_response
    follow_req.status = "responded"
    follow_req.responded_at = datetime.now(timezone.utc)

    # Notify the doctor
    try:
        dr_res = await db.execute(select(DoctorProfile).where(DoctorProfile.id == follow_req.doctor_id))
        doctor = dr_res.scalar_one_or_none()
        if doctor:
            await create_notification(
                user_id=doctor.user_id,
                title="Patient Responded to Follow-Up",
                content=f"{patient.full_name} has responded to your follow-up request.",
                notification_type="follow_request_response",
                db=db,
            )
    except Exception as e:
        print(f"Failed to notify doctor: {e}")

    await db.commit()
    await db.refresh(follow_req)
    return _to_response(follow_req)


@router.put("/{request_id}/acknowledge", response_model=FollowRequestResponse)
async def acknowledge_follow_request(
    request_id: str,
    current_user: dict = Depends(require_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Patient acknowledges (reads) the follow-up request without a full response.
    Status changes to 'acknowledged'.
    """
    pt_res = await db.execute(select(PatientProfile).where(PatientProfile.user_id == current_user["user_id"]))
    patient = pt_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    result = await db.execute(
        select(DoctorFollowRequest).where(
            DoctorFollowRequest.id == request_id,
            DoctorFollowRequest.patient_id == patient.id,
            DoctorFollowRequest.status == "pending",
        )
    )
    follow_req = result.scalar_one_or_none()
    if not follow_req:
        raise HTTPException(status_code=404, detail="Pending follow-up request not found")

    follow_req.status = "acknowledged"
    await db.commit()
    await db.refresh(follow_req)
    return _to_response(follow_req)
