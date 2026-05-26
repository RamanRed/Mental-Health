"""Groq and local LLM response generation."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from backend.config import settings

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """
You are MANAS, a multilingual mental health support assistant on WhatsApp.
Be warm, emotionally intelligent, calm, conversational, and non-judgmental.
Support people dealing with stress, loneliness, anxiety, overthinking, burnout,
sadness, and emotional exhaustion.

Do not diagnose. Do not sound clinical. Do not claim to be a therapist.
Do not give harmful advice. Avoid generic motivational slogans.
Use the user's recent context naturally if it is relevant.
Keep responses concise enough for WhatsApp: usually 3-6 short sentences.
If the user seems overwhelmed, offer one gentle next step.
"""


@dataclass(frozen=True)
class AIRequest:
    user_message: str
    emotion: str
    mood_score: int
    memory_context: str


class LLMService:
    def __init__(self) -> None:
        self._groq_client = None
        self._local_pipeline = None

        groq_api_key = self._groq_api_key()
        if settings.AI_PROVIDER == "groq" and groq_api_key:
            try:
                from groq import Groq

                self._groq_client = Groq(api_key=groq_api_key)
            except Exception:
                logger.exception("Groq client initialization failed; local fallback will be used")

    def generate_response(self, request: AIRequest) -> str:
        if settings.AI_PROVIDER == "groq" and self._groq_client and self._groq_api_key():
            try:
                return self._generate_groq(request)
            except Exception:
                logger.exception("Groq generation failed; using local fallback")
        return self._generate_local_or_template(request)

    def _groq_api_key(self) -> str | None:
        if not settings.GROQ_API_KEY:
            return None
        keys = [key.strip() for key in settings.GROQ_API_KEY.split(",") if key.strip()]
        return keys[0] if keys else None

    def _generate_groq(self, request: AIRequest) -> str:
        user_prompt = (
            f"Recent memory:\n{request.memory_context}\n\n"
            f"Detected emotion: {request.emotion}\n"
            f"Mood score: {request.mood_score}/100\n\n"
            f"User message:\n{request.user_message}"
        )
        response = self._groq_client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=300,
        )
        return response.choices[0].message.content.strip()

    def _generate_local_or_template(self, request: AIRequest) -> str:
        if not self._local_pipeline and settings.ENABLE_HEAVY_MODELS:
            try:
                from transformers import pipeline

                self._local_pipeline = pipeline("text2text-generation", model=settings.LOCAL_LLM_MODEL)
            except Exception:
                logger.exception("Local LLM load failed; using template response")

        if self._local_pipeline:
            prompt = (
                f"{SYSTEM_PROMPT}\nEmotion: {request.emotion}\n"
                f"Context: {request.memory_context}\nUser: {request.user_message}\nAssistant:"
            )
            result = self._local_pipeline(prompt, max_new_tokens=160)[0]["generated_text"]
            return str(result).strip()

        return self._template_response(request)

    def _template_response(self, request: AIRequest) -> str:
        emotion = request.emotion
        if emotion in {"anxiety", "stress", "emotional exhaustion"}:
            return (
                "That sounds like a lot to carry right now. I am here with you. "
                "Try taking one slow breath and naming the one thing that feels most urgent. "
                "We can look at just that piece together, step by step."
            )
        if emotion == "loneliness":
            return (
                "Feeling alone can be really painful, especially when it feels like no one fully sees it. "
                "I am glad you told me. What has been making the loneliness feel strongest today?"
            )
        if emotion == "sadness":
            return (
                "I am sorry today feels heavy. You do not have to force yourself to be okay here. "
                "Can you tell me what part of the day hurt the most?"
            )
        if emotion == "anger":
            return (
                "It makes sense that your system feels stirred up. Let us slow it down before deciding what to do. "
                "What happened just before the anger got intense?"
            )
        return (
            "I hear you. Thank you for sharing that with me. "
            "What feels most important for me to understand about this right now?"
        )
