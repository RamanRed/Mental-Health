"""Emotion detection and mood scoring."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Optional

from backend.config import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class EmotionResult:
    emotion: str
    confidence: float


KEYWORD_RULES: list[tuple[str, list[str]]] = [
    ("emotional exhaustion", ["exhausted", "drained", "burnout", "burned out", "tired of everything"]),
    ("anxiety", ["anxious", "panic", "worried", "overthinking", "restless", "nervous"]),
    ("loneliness", ["lonely", "alone", "ignored", "no one", "isolated"]),
    ("stress", ["stress", "stressed", "pressure", "overwhelmed", "deadline", "exam"]),
    ("sadness", ["sad", "cry", "empty", "down", "depressed", "heartbroken"]),
    ("anger", ["angry", "furious", "irritated", "annoyed", "rage"]),
    ("fear", ["scared", "afraid", "fear", "terrified", "unsafe"]),
    ("happiness", ["happy", "grateful", "good", "better", "relieved", "excited"]),
]

MOOD_SCORES = {
    "happiness": 78,
    "sadness": 30,
    "stress": 38,
    "anxiety": 35,
    "loneliness": 32,
    "anger": 40,
    "fear": 34,
    "emotional exhaustion": 25,
    "neutral": 55,
}


class EmotionService:
    def __init__(self) -> None:
        self._pipeline = None
        if settings.ENABLE_HEAVY_MODELS:
            try:
                from transformers import pipeline

                self._pipeline = pipeline("text-classification", model=settings.EMOTION_MODEL, top_k=1)
            except Exception:
                logger.exception("Failed to load transformer emotion model; using keyword fallback")

    def detect(self, text: str) -> EmotionResult:
        if self._pipeline:
            try:
                prediction = self._pipeline(text)[0][0]
                emotion = self._normalize_label(str(prediction["label"]))
                confidence = float(prediction["score"])
                return EmotionResult(emotion=emotion, confidence=round(confidence, 2))
            except Exception:
                logger.exception("Transformer emotion inference failed; using keyword fallback")

        lowered = text.lower()
        for emotion, words in KEYWORD_RULES:
            if any(word in lowered for word in words):
                confidence = 0.86 if emotion in {"anxiety", "stress", "sadness"} else 0.78
                return EmotionResult(emotion=emotion, confidence=confidence)

        return EmotionResult(emotion="neutral", confidence=0.55)

    def mood_score(self, emotion: str, text: str) -> int:
        score = MOOD_SCORES.get(emotion, 55)
        intensifiers = ["very", "extremely", "too much", "can't", "cannot", "always", "never"]
        if any(word in text.lower() for word in intensifiers) and score < 55:
            score -= 8
        return max(0, min(100, score))

    def extract_trigger(self, text: str) -> Optional[str]:
        patterns = [
            r"\bexam[s]?\b",
            r"\bwork\b",
            r"\bjob\b",
            r"\bfamily\b",
            r"\brelationship\b",
            r"\bmoney\b",
            r"\bsleep\b",
            r"\bcollege\b",
            r"\bschool\b",
            r"\bhealth\b",
            r"\bloneliness\b",
            r"\bburnout\b",
        ]
        lowered = text.lower()
        for pattern in patterns:
            match = re.search(pattern, lowered)
            if match:
                return match.group(0)
        return None

    def _normalize_label(self, label: str) -> str:
        normalized = label.lower().replace("_", " ")
        if normalized in MOOD_SCORES:
            return normalized
        if normalized == "joy":
            return "happiness"
        return normalized
