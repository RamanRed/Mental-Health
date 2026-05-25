"""
Mood schemas — request/response models for mood tracking, streaks, and trends.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class MoodEntryCreate(BaseModel):
    """Create a new mood entry."""
    patient_id: Optional[str] = None  # Auto-set from JWT for patients, required for guardians
    mood_emoji: Optional[str] = None
    mood_score: Optional[int] = Field(None, ge=1, le=10)
    text_note: Optional[str] = None
    voice_note_path: Optional[str] = None
    traits: Optional[Dict[str, Any]] = None  # {sleep_hours, sleep_quality, appetite, social, activity, stress}


class MoodEntryResponse(BaseModel):
    """Mood entry response."""
    id: str
    patient_id: str
    mood_emoji: Optional[str] = None
    mood_score: Optional[int] = None
    text_note: Optional[str] = None
    voice_note_path: Optional[str] = None
    traits: Optional[Dict[str, Any]] = None
    filled_by: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class StreakResponse(BaseModel):
    """Streak info response."""
    id: str
    patient_id: str
    current_streak: int = 0
    longest_streak: int = 0
    last_entry_date: Optional[str] = None
    milestones: Optional[List[Any]] = None

    model_config = {"from_attributes": True}


class MoodTrendResponse(BaseModel):
    """Mood trend data for charts."""
    patient_id: str
    days: int
    entries: List[MoodEntryResponse]
    average_score: Optional[float] = None
    trend_direction: Optional[str] = None  # improving/stable/declining
