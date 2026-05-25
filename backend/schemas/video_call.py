"""
Video call schemas — request/response Pydantic models for video call operations.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class CallInitiate(BaseModel):
    """Payload to initiate a video call."""
    callee_id: str  # User ID of recipient
    call_type: str = Field(default="scheduled", pattern="^(scheduled|emergency)$")
    session_id: Optional[str] = None  # Link to active consultation session if applicable


class CallSignal(BaseModel):
    """Payload for WebRTC signaling (SDP offer/answer and ICE candidates)."""
    type: str  # 'offer', 'answer', 'candidate', 'hangup'
    payload: Any  # SDP string or ICE candidate dictionary


class VideoCallResponse(BaseModel):
    """Video call details response."""
    id: str
    caller_id: str
    callee_id: str
    session_id: Optional[str] = None
    call_type: str
    status: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime
    caller_name: Optional[str] = None
    callee_name: Optional[str] = None

    model_config = {"from_attributes": True}
