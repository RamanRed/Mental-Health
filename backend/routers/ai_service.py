"""
AI Service Router — exposes AI capabilities as REST endpoints.
Includes audio file upload and real/simulated transcription, auto-fill, and summary pipelines.
"""

import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth_middleware import get_current_user
from services.screening_service import run_screening
from services.screening_scheduler import screen_all_active_patients
from services.transcription_service import transcribe_audio, auto_fill_form, generate_summary

router = APIRouter(prefix="/api/ai", tags=["AI Services"])

# Define directory to save audio uploads
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")


# --- Request Models ---

class ScreenRequest(BaseModel):
    """Request body for screening."""
    patient_id: str


class TranscribeRequest(BaseModel):
    """Request body for transcription."""
    audio_path: str


class AutoFillRequest(BaseModel):
    """Request body for form auto-fill."""
    transcript: str
    form_schema: Optional[Dict[str, Any]] = None


class SummarizeRequest(BaseModel):
    """Request body for summary generation."""
    form_data: Optional[Dict[str, Any]] = None
    transcript: Optional[str] = None


# --- Endpoints ---

@router.post("/upload-audio")
async def upload_audio(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload an audio recording of a consultation session.
    Saves the file locally and returns its path for transcription.
    """
    # Ensure upload directory exists
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

    # Validate file extension
    allowed_extensions = {".mp3", ".wav", ".m4a", ".ogg", ".webm", ".flac", ".mp4"}
    _, ext = os.path.splitext(file.filename or "")
    if not ext or ext.lower() not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Allowed formats: {', '.join(allowed_extensions)}",
        )

    # Save file with unique name
    unique_filename = f"{uuid.uuid4()}{ext.lower()}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save uploaded audio file: {str(e)}",
        )

    # Normalize file path for Python cross-platform use
    normalized_path = os.path.abspath(file_path).replace("\\", "/")

    return {
        "status": "success",
        "audio_path": normalized_path,
        "filename": file.filename,
    }


@router.post("/screen")
async def screen_patient(
    request: ScreenRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Run AI-powered mental health screening for a patient.
    Analyzes patient mood logs and questionnaire responses.
    """
    result = await run_screening(request.patient_id, db)
    return {"status": "success", "screening": result}


@router.post("/transcribe")
async def transcribe(
    request: TranscribeRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Transcribe audio from a consultation recording.
    Invokes Whisper model transcription on the provided file path.
    """
    transcript = await transcribe_audio(request.audio_path)
    return {"status": "success", "transcript": transcript}


@router.post("/auto-fill")
async def auto_fill(
    request: AutoFillRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Auto-fill a clinical form from a consultation transcript.
    Extracts symptoms and details into form schema fields.
    """
    form_data = await auto_fill_form(request.transcript, request.form_schema)
    return {"status": "success", "form_data": form_data}


@router.post("/summarize")
async def summarize(
    request: SummarizeRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate a consultation summary from form data and/or transcript.
    """
    summary = await generate_summary(request.form_data, request.transcript)
    return {"status": "success", "summary": summary}


@router.post("/screen-all")
async def screen_all_patients(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Run AI-powered screening diagnostic for all active patients.
    """
    results = await screen_all_active_patients(db)
    return {
        "status": "success",
        "message": f"Successfully ran batch screening for {len(results)} patients.",
        "results": results
    }
