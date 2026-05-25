"""
Transcript Router — CRUD for call transcripts linked to consultation sessions.
Doctors can save, view, and edit transcripts generated from audio/video calls.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import uuid4
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models.transcript import CallTranscript
from models.doctor import DoctorProfile
from models.patient import PatientProfile
from middleware.auth_middleware import get_current_user, require_doctor

router = APIRouter(prefix="/api/transcripts", tags=["Transcripts"])


# ── Schemas (inline — lightweight) ──────────────────────────────────────────

class TranscriptCreate(BaseModel):
    call_id: Optional[str] = None
    consultation_id: Optional[str] = None
    patient_id: str
    raw_transcript: Optional[str] = None
    edited_transcript: Optional[str] = None
    language: str = "en"
    source: str = "auto"


class TranscriptUpdate(BaseModel):
    edited_transcript: Optional[str] = None
    raw_transcript: Optional[str] = None


class TranscriptResponse(BaseModel):
    id: str
    call_id: Optional[str] = None
    consultation_id: Optional[str] = None
    doctor_id: str
    patient_id: str
    raw_transcript: Optional[str] = None
    edited_transcript: Optional[str] = None
    language: str
    source: str
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _get_doctor(user_id: str, db: AsyncSession) -> DoctorProfile:
    result = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == user_id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    return doctor


def _to_response(t: CallTranscript) -> TranscriptResponse:
    return TranscriptResponse(
        id=t.id,
        call_id=t.call_id,
        consultation_id=t.consultation_id,
        doctor_id=t.doctor_id,
        patient_id=t.patient_id,
        raw_transcript=t.raw_transcript,
        edited_transcript=t.edited_transcript,
        language=t.language,
        source=t.source,
        created_at=t.created_at.isoformat(),
        updated_at=t.updated_at.isoformat(),
    )


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("", response_model=TranscriptResponse)
async def create_transcript(
    payload: TranscriptCreate,
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """
    Save a new transcript for a consultation or video call.
    Only the doctor who owns the session can create it.
    """
    doctor = await _get_doctor(current_user["user_id"], db)

    # Verify patient exists
    p_res = await db.execute(select(PatientProfile).where(PatientProfile.id == payload.patient_id))
    if not p_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Patient not found")

    transcript = CallTranscript(
        id=str(uuid4()),
        call_id=payload.call_id,
        consultation_id=payload.consultation_id,
        doctor_id=doctor.id,
        patient_id=payload.patient_id,
        raw_transcript=payload.raw_transcript,
        edited_transcript=payload.edited_transcript,
        language=payload.language,
        source=payload.source,
    )
    db.add(transcript)
    await db.commit()
    await db.refresh(transcript)
    return _to_response(transcript)


@router.get("/consultation/{consultation_id}", response_model=list[TranscriptResponse])
async def get_transcripts_for_consultation(
    consultation_id: str,
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch all transcripts linked to a specific consultation session.
    """
    doctor = await _get_doctor(current_user["user_id"], db)
    result = await db.execute(
        select(CallTranscript).where(
            CallTranscript.consultation_id == consultation_id,
            CallTranscript.doctor_id == doctor.id,
        ).order_by(CallTranscript.created_at.desc())
    )
    transcripts = result.scalars().all()
    return [_to_response(t) for t in transcripts]


@router.get("/call/{call_id}", response_model=list[TranscriptResponse])
async def get_transcripts_for_call(
    call_id: str,
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch all transcripts linked to a specific video call.
    """
    doctor = await _get_doctor(current_user["user_id"], db)
    result = await db.execute(
        select(CallTranscript).where(
            CallTranscript.call_id == call_id,
            CallTranscript.doctor_id == doctor.id,
        ).order_by(CallTranscript.created_at.desc())
    )
    transcripts = result.scalars().all()
    return [_to_response(t) for t in transcripts]


@router.put("/{transcript_id}", response_model=TranscriptResponse)
async def update_transcript(
    transcript_id: str,
    updates: TranscriptUpdate,
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """
    Update (edit) a transcript — typically the doctor corrects the auto-generated text.
    """
    doctor = await _get_doctor(current_user["user_id"], db)
    result = await db.execute(
        select(CallTranscript).where(
            CallTranscript.id == transcript_id,
            CallTranscript.doctor_id == doctor.id,
        )
    )
    transcript = result.scalar_one_or_none()
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found or access denied")

    if updates.edited_transcript is not None:
        transcript.edited_transcript = updates.edited_transcript
    if updates.raw_transcript is not None:
        transcript.raw_transcript = updates.raw_transcript

    await db.commit()
    await db.refresh(transcript)
    return _to_response(transcript)


@router.delete("/{transcript_id}")
async def delete_transcript(
    transcript_id: str,
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a transcript record. Only the owning doctor can delete.
    """
    doctor = await _get_doctor(current_user["user_id"], db)
    result = await db.execute(
        select(CallTranscript).where(
            CallTranscript.id == transcript_id,
            CallTranscript.doctor_id == doctor.id,
        )
    )
    transcript = result.scalar_one_or_none()
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found or access denied")

    await db.delete(transcript)
    await db.commit()
    return {"message": "Transcript deleted successfully"}
