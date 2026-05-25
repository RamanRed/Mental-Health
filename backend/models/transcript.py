"""
CallTranscript model — stores audio transcription text linked to video call sessions.
"""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base


class CallTranscript(Base):
    """
    Stores the transcribed text of a video/audio call session.
    Linked to a VideoCall or Consultation session for doctor review.
    """
    __tablename__ = "call_transcripts"

    id = Column(String(36), primary_key=True, index=True)
    call_id = Column(String(36), ForeignKey("video_calls.id"), nullable=True, index=True)
    consultation_id = Column(String(36), ForeignKey("consultations.id"), nullable=True, index=True)
    doctor_id = Column(String(36), ForeignKey("doctor_profiles.id"), nullable=False, index=True)
    patient_id = Column(String(36), ForeignKey("patient_profiles.id"), nullable=False, index=True)
    raw_transcript = Column(Text, nullable=True)        # Raw ASR output
    edited_transcript = Column(Text, nullable=True)     # Doctor-edited version
    language = Column(String(10), default="en", nullable=False)
    source = Column(String(20), default="auto", nullable=False)  # auto / manual / groq / whisper
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
