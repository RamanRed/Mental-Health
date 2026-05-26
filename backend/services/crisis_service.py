"""Crisis phrase detection and safe response handling."""

from __future__ import annotations

import re


CRISIS_PATTERNS = [
    r"\bkill myself\b",
    r"\bend my life\b",
    r"\bsuicide\b",
    r"\bsuicidal\b",
    r"\bself[- ]?harm\b",
    r"\bhurt myself\b",
    r"\bno reason to live\b",
    r"\bcan't go on\b",
    r"\bi want to die\b",
    r"\blife is not worth\b",
    r"\bhopeless\b.*\bforever\b",
]


def detect_crisis(text: str) -> bool:
    lowered = text.lower()
    return any(re.search(pattern, lowered) for pattern in CRISIS_PATTERNS)


def crisis_response() -> str:
    return (
        "I am really sorry you are feeling this much pain. You do not have to "
        "handle this alone right now. Please contact someone you trust nearby, "
        "or call your local emergency number immediately if you might hurt "
        "yourself. If you are in India, you can also contact KIRAN at "
        "1800-599-0019 for mental health support. If you can, move away from "
        "anything you could use to harm yourself and stay with another person "
        "while you get help."
    )
