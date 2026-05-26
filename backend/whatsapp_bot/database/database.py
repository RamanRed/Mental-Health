"""SQLite helpers for the WhatsApp mental health assistant."""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator, Optional

from backend.config import settings


DB_PATH = Path(settings.WHATSAPP_DB_PATH)


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS mood_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                raw_message TEXT NOT NULL,
                normalized_message TEXT NOT NULL,
                language TEXT NOT NULL,
                emotion TEXT NOT NULL,
                confidence REAL NOT NULL,
                mood_score INTEGER NOT NULL,
                stress_trigger TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_mood_user_time
            ON mood_entries(user_id, timestamp);

            CREATE TABLE IF NOT EXISTS conversation_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                language TEXT NOT NULL,
                emotion TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_conversation_user_time
            ON conversation_messages(user_id, timestamp);

            CREATE TABLE IF NOT EXISTS journal_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                entry_date TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                raw_text TEXT NOT NULL,
                analysis_json TEXT NOT NULL
            );

            CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_user_date
            ON journal_entries(user_id, entry_date);
            """
        )


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def save_mood_entry(
    *,
    user_id: str,
    raw_message: str,
    normalized_message: str,
    language: str,
    emotion: str,
    confidence: float,
    mood_score: int,
    stress_trigger: Optional[str],
) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO mood_entries (
                user_id, timestamp, raw_message, normalized_message, language,
                emotion, confidence, mood_score, stress_trigger
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                now_iso(),
                raw_message,
                normalized_message,
                language,
                emotion,
                confidence,
                mood_score,
                stress_trigger,
            ),
        )


def save_conversation_message(
    *,
    user_id: str,
    role: str,
    content: str,
    language: str,
    emotion: Optional[str] = None,
) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO conversation_messages (
                user_id, timestamp, role, content, language, emotion
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (user_id, now_iso(), role, content, language, emotion),
        )


def save_journal_entry(user_id: str, raw_text: str, analysis: dict[str, Any]) -> None:
    entry_date = datetime.now(timezone.utc).date().isoformat()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO journal_entries (
                user_id, entry_date, timestamp, raw_text, analysis_json
            )
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id, entry_date) DO UPDATE SET
                timestamp = excluded.timestamp,
                raw_text = excluded.raw_text,
                analysis_json = excluded.analysis_json
            """,
            (user_id, entry_date, now_iso(), raw_text, json.dumps(analysis)),
        )


def fetch_recent_messages(user_id: str, limit: int) -> list[sqlite3.Row]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT role, content, emotion, timestamp
            FROM conversation_messages
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()
    return list(reversed(rows))


def fetch_recent_moods(user_id: str, limit: int = 20) -> list[sqlite3.Row]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT emotion, mood_score, stress_trigger, timestamp
            FROM mood_entries
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()
    return list(rows)
