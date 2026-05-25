"""
Mood tracking models — MoodEntry and Streak for daily mood logging and gamification.
"""

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON, Text
from sqlalchemy.sql import func
from database import Base


class MoodEntry(Base):
    """
    Individual mood log entry with emoji, score, notes, and behavioral traits.
    Can be filled by the patient or a guardian on their behalf.
    """
    __tablename__ = "mood_entries"

    id = Column(String(36), primary_key=True, index=True)
    patient_id = Column(String(36), ForeignKey("patient_profiles.id"), nullable=False, index=True)
    mood_emoji = Column(String(10), nullable=True)
    mood_score = Column(Integer, nullable=True)  # 1-10
    text_note = Column(Text, nullable=True)
    voice_note_path = Column(String(500), nullable=True)
    # Behavioral traits JSON: {sleep_hours, sleep_quality, appetite, social, activity, stress}
    traits = Column(JSON, default=dict, nullable=True)
    # Who filled this entry (patient or guardian)
    filled_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class Streak(Base):
    """
    Mood logging streak tracker per patient for engagement/gamification.
    """
    __tablename__ = "streaks"

    id = Column(String(36), primary_key=True, index=True)
    patient_id = Column(String(36), ForeignKey("patient_profiles.id"), unique=True, nullable=False, index=True)
    current_streak = Column(Integer, default=0, nullable=False)
    longest_streak = Column(Integer, default=0, nullable=False)
    last_entry_date = Column(String(20), nullable=True)
    milestones = Column(JSON, default=list, nullable=True)
