"""Conversation memory and mood trend retrieval."""

from __future__ import annotations

from collections import Counter

from backend.config import settings
from backend.whatsapp_bot.database import database


class MemoryService:
    def save_user_message(self, user_id: str, content: str, language: str, emotion: str) -> None:
        database.save_conversation_message(
            user_id=user_id,
            role="user",
            content=content,
            language=language,
            emotion=emotion,
        )

    def save_assistant_message(self, user_id: str, content: str, language: str) -> None:
        database.save_conversation_message(
            user_id=user_id,
            role="assistant",
            content=content,
            language=language,
        )

    def context_summary(self, user_id: str) -> str:
        messages = database.fetch_recent_messages(user_id, settings.MAX_MEMORY_MESSAGES)
        moods = database.fetch_recent_moods(user_id)

        recent_lines = [
            f"{row['role']}: {row['content']} ({row['emotion'] or 'no emotion'})"
            for row in messages
        ]

        emotions = Counter(row["emotion"] for row in moods if row["emotion"])
        triggers = Counter(row["stress_trigger"] for row in moods if row["stress_trigger"])

        context = []
        if recent_lines:
            context.append("Recent conversation:\n" + "\n".join(recent_lines))
        if emotions:
            context.append("Recent emotional pattern: " + ", ".join(f"{k} x{v}" for k, v in emotions.most_common(4)))
        if triggers:
            context.append("Repeated triggers: " + ", ".join(f"{k} x{v}" for k, v in triggers.most_common(4)))
        return "\n\n".join(context) if context else "No prior context yet."
