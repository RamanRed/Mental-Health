"""Language detection and IndicTrans2 translation wrapper."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

from backend.config import settings

logger = logging.getLogger(__name__)


LANGUAGE_CODES = {
    "english": "eng_Latn",
    "hindi": "hin_Deva",
    "marathi": "mar_Deva",
    "kannada": "kan_Knda",
    "telugu": "tel_Telu",
    "tamil": "tam_Taml",
}


@dataclass(frozen=True)
class TranslationResult:
    original_text: str
    text_en: str
    language: str
    language_code: str


class TranslationService:
    def __init__(self) -> None:
        self._indic_to_en = None
        self._en_to_indic = None
        if settings.ENABLE_HEAVY_MODELS:
            self._load_models()

    def detect_language(self, text: str) -> tuple[str, str]:
        if re.search(r"[\u0900-\u097F]", text):
            return "hindi", LANGUAGE_CODES["hindi"]
        if re.search(r"[\u0C80-\u0CFF]", text):
            return "kannada", LANGUAGE_CODES["kannada"]
        if re.search(r"[\u0C00-\u0C7F]", text):
            return "telugu", LANGUAGE_CODES["telugu"]
        if re.search(r"[\u0B80-\u0BFF]", text):
            return "tamil", LANGUAGE_CODES["tamil"]
        return "english", LANGUAGE_CODES["english"]

    def to_english(self, text: str) -> TranslationResult:
        language, code = self.detect_language(text)
        if language == "english":
            return TranslationResult(text, text, language, code)

        translated = self._translate(text, source_lang=code, target_lang=LANGUAGE_CODES["english"])
        return TranslationResult(text, translated, language, code)

    def from_english(self, text: str, target_language_code: str) -> str:
        if target_language_code == LANGUAGE_CODES["english"]:
            return text
        return self._translate(text, source_lang=LANGUAGE_CODES["english"], target_lang=target_language_code)

    def _load_models(self) -> None:
        try:
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

            self._indic_tokenizer = AutoTokenizer.from_pretrained(settings.INDIC_TO_EN_MODEL, trust_remote_code=True)
            self._indic_to_en = AutoModelForSeq2SeqLM.from_pretrained(settings.INDIC_TO_EN_MODEL, trust_remote_code=True)
            self._reverse_tokenizer = AutoTokenizer.from_pretrained(settings.EN_TO_INDIC_MODEL, trust_remote_code=True)
            self._en_to_indic = AutoModelForSeq2SeqLM.from_pretrained(settings.EN_TO_INDIC_MODEL, trust_remote_code=True)
        except Exception:
            logger.exception("Failed to load IndicTrans2 models; translations will use graceful fallback")

    def _translate(self, text: str, source_lang: str, target_lang: str) -> str:
        if not self._indic_to_en or not self._en_to_indic:
            logger.info(
                "translation_fallback",
                extra={"source_lang": source_lang, "target_lang": target_lang},
            )
            return text

        try:
            tokenizer = self._indic_tokenizer if target_lang == LANGUAGE_CODES["english"] else self._reverse_tokenizer
            model = self._indic_to_en if target_lang == LANGUAGE_CODES["english"] else self._en_to_indic
            prompt = f"{source_lang} {target_lang} {text}"
            inputs = tokenizer(prompt, return_tensors="pt", truncation=True)
            outputs = model.generate(**inputs, max_new_tokens=256)
            return str(tokenizer.decode(outputs[0], skip_special_tokens=True))
        except Exception:
            logger.exception("Translation failed; returning original text")
            return text
