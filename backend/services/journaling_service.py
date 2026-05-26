"""Daily journaling analysis."""

from __future__ import annotations

import json
import re
from typing import Any


class JournalingService:
    JOURNAL_TRIGGERS = {
        "journal",
        "daily journal",
        "reflect",
        "reflection",
        "how was my day",
    }

    def is_journal_request(self, text: str) -> bool:
        lowered = text.lower().strip()
        return any(trigger in lowered for trigger in self.JOURNAL_TRIGGERS)

    def prompt(self) -> str:
        return "How was your day today? Write 4-5 things you felt today."

    def analyze(self, text: str) -> dict[str, Any]:
        sentences = [part.strip() for part in re.split(r"[.!?\n]+", text) if part.strip()]
        positive, negative, triggers, gratitude = [], [], [], []

        for sentence in sentences:
            lowered = sentence.lower()
            if any(word in lowered for word in ["happy", "good", "calm", "proud", "relieved", "nice"]):
                positive.append(sentence)
            if any(word in lowered for word in ["sad", "stress", "angry", "tired", "lonely", "worried", "bad"]):
                negative.append(sentence)
            if any(word in lowered for word in ["exam", "work", "family", "money", "deadline", "sleep"]):
                triggers.append(sentence)
            if any(word in lowered for word in ["grateful", "thankful", "appreciate", "blessed"]):
                gratitude.append(sentence)

        overall_mood = "mixed"
        if positive and not negative:
            overall_mood = "positive"
        elif negative and not positive:
            overall_mood = "low"

        risk_level = "low"
        if any(word in text.lower() for word in ["suicide", "die", "self harm", "hurt myself"]):
            risk_level = "high"
        elif len(negative) >= 3:
            risk_level = "medium"

        return {
            "overall_mood": overall_mood,
            "positive_events": positive,
            "negative_events": negative,
            "stress_triggers": triggers,
            "gratitude_signals": gratitude,
            "risk_level": risk_level,
            "emotional_summary": self._summary(overall_mood, positive, negative),
            "mood_analysis": "Your entry suggests a day with emotional highs and lows." if overall_mood == "mixed" else f"Your entry appears {overall_mood}.",
            "journaling_insights": [
                "Notice which moments changed your energy most.",
                "A small grounding routine may help after repeated stress triggers.",
            ],
        }

    def as_pretty_json(self, analysis: dict[str, Any]) -> str:
        return json.dumps(analysis, ensure_ascii=False, indent=2)

    def _summary(self, overall_mood: str, positive: list[str], negative: list[str]) -> str:
        if overall_mood == "positive":
            return "You noticed some supportive or hopeful moments today."
        if overall_mood == "low":
            return "Today sounds emotionally heavy, and it makes sense that you may feel drained."
        return "There were both difficult and supportive parts in your day."
