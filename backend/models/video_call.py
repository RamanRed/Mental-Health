"""
VideoCall model — tracks video calls between doctors and patients, including WebRTC signaling states.
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from database import Base


class VideoCall(Base):
    """
    Represents a WebRTC video call session.
    """
    __tablename__ = "video_calls"

    id = Column(String(36), primary_key=True, index=True)
    caller_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    callee_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    session_id = Column(String(36), ForeignKey("consultations.id"), nullable=True)
    call_type = Column(String(20), default="scheduled", nullable=False)  # scheduled/emergency
    status = Column(String(20), default="ringing", nullable=False)  # ringing/accepted/in_progress/ended/rejected/missed
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    signals = Column(JSON, default=list, nullable=False)  # List of WebRTC signaling payloads (SDP/ICE)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
