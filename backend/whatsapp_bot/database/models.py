"""Database schema for WhatsApp mood, memory, and journaling data."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass(frozen=True)
class MoodEntry:
    id: int
    user_id: str
    timestamp: datetime
    raw_message: str
    normalized_message: str
    language: str
    emotion: str
    confidence: float
    mood_score: int
    stress_trigger: Optional[str]


@dataclass(frozen=True)
class ConversationMessage:
    id: int
    user_id: str
    timestamp: datetime
    role: str
    content: str
    language: str
    emotion: Optional[str]


@dataclass(frozen=True)
class JournalEntry:
    id: int
    user_id: str
    entry_date: str
    timestamp: datetime
    raw_text: str
    analysis_json: str
