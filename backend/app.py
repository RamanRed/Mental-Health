"""Flask WhatsApp webhook for the MANAS AI mental health assistant."""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path
from typing import Any

from flask import Flask, Response, request
from twilio.twiml.messaging_response import MessagingResponse


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.services.crisis_service import crisis_response, detect_crisis
from backend.services.emotion_service import EmotionService
from backend.services.journaling_service import JournalingService
from backend.services.llm_service import AIRequest, LLMService
from backend.services.memory_service import MemoryService
from backend.services.translation_service import TranslationService
from backend.whatsapp_bot.database import database


class JsonFormatter(logging.Formatter):
    """Small JSON log formatter for webhook observability."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key in ("user_id", "language", "emotion", "mood_score", "route"):
            value = getattr(record, key, None)
            if value is not None:
                payload[key] = value
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    logging.basicConfig(level=logging.INFO, handlers=[handler], force=True)


configure_logging()
logger = logging.getLogger(__name__)


def create_app() -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__)
    database.init_db()

    translation_service = TranslationService()
    emotion_service = EmotionService()
    journaling_service = JournalingService()
    memory_service = MemoryService()
    llm_service = LLMService()

    @app.get("/health")
    def health_check() -> dict[str, str]:
        """Simple health check for local testing."""
        return {"status": "healthy", "service": "MANAS WhatsApp AI webhook"}

    @app.post("/whatsapp")
    def whatsapp_webhook() -> Response:
        """Receive WhatsApp text from Twilio and return a TwiML reply."""
        user_id = request.form.get("From", "unknown").strip()
        incoming_message = request.form.get("Body", "").strip()

        logger.info("incoming_whatsapp_message", extra={"user_id": user_id, "route": "/whatsapp"})

        reply = process_user_message(
            user_id=user_id,
            incoming_message=incoming_message,
            translation_service=translation_service,
            emotion_service=emotion_service,
            journaling_service=journaling_service,
            memory_service=memory_service,
            llm_service=llm_service,
        )

        twilio_response = MessagingResponse()
        twilio_response.message(reply)
        return Response(str(twilio_response), mimetype="application/xml")

    return app


def process_user_message(
    *,
    user_id: str,
    incoming_message: str,
    translation_service: TranslationService,
    emotion_service: EmotionService,
    journaling_service: JournalingService,
    memory_service: MemoryService,
    llm_service: LLMService,
) -> str:
    if not incoming_message:
        return "I am here with you. Send me a message whenever you are ready."

    translated = translation_service.to_english(incoming_message)
    logger.info(
        "translation_complete",
        extra={"user_id": user_id, "language": translated.language},
    )

    emotion = emotion_service.detect(translated.text_en)
    mood_score = emotion_service.mood_score(emotion.emotion, translated.text_en)
    trigger = emotion_service.extract_trigger(translated.text_en)
    logger.info(
        "emotion_detected",
        extra={
            "user_id": user_id,
            "language": translated.language,
            "emotion": emotion.emotion,
            "mood_score": mood_score,
        },
    )

    memory_service.save_user_message(user_id, translated.text_en, translated.language, emotion.emotion)
    database.save_mood_entry(
        user_id=user_id,
        raw_message=incoming_message,
        normalized_message=translated.text_en,
        language=translated.language,
        emotion=emotion.emotion,
        confidence=emotion.confidence,
        mood_score=mood_score,
        stress_trigger=trigger,
    )

    if detect_crisis(translated.text_en):
        english_reply = crisis_response()
        logger.warning("crisis_detected", extra={"user_id": user_id, "emotion": emotion.emotion})
    elif translated.text_en.lower().startswith("journal:"):
        journal_text = translated.text_en.split(":", 1)[1].strip()
        analysis = journaling_service.analyze(journal_text)
        database.save_journal_entry(user_id, journal_text, analysis)
        english_reply = journaling_service.as_pretty_json(analysis)
    elif journaling_service.is_journal_request(translated.text_en):
        english_reply = journaling_service.prompt()
    else:
        memory_context = memory_service.context_summary(user_id)
        english_reply = llm_service.generate_response(
            AIRequest(
                user_message=translated.text_en,
                emotion=emotion.emotion,
                mood_score=mood_score,
                memory_context=memory_context,
            )
        )

    final_reply = translation_service.from_english(english_reply, translated.language_code)
    memory_service.save_assistant_message(user_id, english_reply, translated.language)

    logger.info(
        "assistant_reply_ready",
        extra={
            "user_id": user_id,
            "language": translated.language,
            "emotion": emotion.emotion,
            "mood_score": mood_score,
        },
    )
    return final_reply


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
