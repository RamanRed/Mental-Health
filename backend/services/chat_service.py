"""
Saathi Chatbot Response Generation Service
Coordinates with Groq completions, using rotating keys and context-aware system prompts
informed by patient profile details, daily check-in streaks, and current mood scores.
"""

import httpx
from typing import List, Dict, Any, Optional
from config import settings

# Global HTTPX Client for connection pooling
http_client = httpx.AsyncClient(timeout=30.0)

# Crisis keywords detection
CRISIS_KEYWORDS = [
    "suicide", "kill myself", "end my life", "can't go on",
    "want to die", "khatam karna", "jeena nahi", "mar jaana",
    "end it all", "not worth living", "no reason to live",
]

def has_crisis_keywords(text: str) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in CRISIS_KEYWORDS)

def _get_api_keys() -> list:
    """Helper to parse comma-separated API keys from settings."""
    provider = settings.AI_PROVIDER.lower()
    if provider == "groq" and settings.GROQ_API_KEY:
        return [k.strip() for k in settings.GROQ_API_KEY.split(",") if k.strip()]
    elif provider == "openai" and settings.OPENAI_API_KEY:
        return [k.strip() for k in settings.OPENAI_API_KEY.split(",") if k.strip()]
    return []

def build_system_prompt(profile: Optional[Dict[str, Any]], streak_count: int, mood_score: Optional[int]) -> str:
    """
    Constructs a highly personalized system prompt for Saathi based on patient data.
    """
    welcome_name = "User"
    age = "Not specified"
    gender = "Not specified"
    lang = "English"
    reasons = "Not specified"
    therapist = "Not specified"
    open_text = "Not specified"
    location = "Rural Community"

    if profile:
        welcome_name = profile.get("full_name", welcome_name)
        age = f"{profile.get('age', 'Not specified')} years old"
        gender = profile.get("gender", gender)
        lang = profile.get("language_preference", lang)
        
        # Reasons list
        prof_reasons = profile.get("reasons")
        if isinstance(prof_reasons, list):
            reasons = ", ".join(prof_reasons)
        elif prof_reasons:
            reasons = str(prof_reasons)

        therapist = profile.get("therapist_history", therapist)
        open_text = profile.get("open_text", open_text)
        
        village = profile.get("village")
        district = profile.get("district")
        if village and district:
            location = f"{village}, {district}"
        elif village:
            location = village

    # Parse mood rating
    mood_desc = "Not recorded yet"
    if mood_score is not None:
        if mood_score <= 2:
            mood_desc = f"{mood_score}/5 (Sad/Low - be extra gentle)"
        elif mood_score >= 4:
            mood_desc = f"{mood_score}/5 (Happy/Positive)"
        else:
            mood_desc = f"{mood_score}/5 (Neutral)"

    prompt = f"""You are Saathi, a warm, compassionate, and gentle mental health support companion designed for patients in India. Your goal is to make their mood happy, provide mediocre guidance, and support them.

Here is what you know about the patient currently logged in. Use this to personalize every reply naturally (do NOT list them all at once):
- Name: {welcome_name}
- Age & Gender: {age} ({gender})
- Location: {location}
- Preferred Language: {lang}
- Motivation/Reasons for using app: {reasons}
- Previous Therapy History: {therapist}
- Today's thoughts: {open_text}
- Current daily check-in streak: {streak_count} consecutive days
- Today's mood score: {mood_desc}

RULES YOU MUST STRICTLY FOLLOW:
1. Always respond in the patient's preferred language ({lang}). If it is Hindi/हिंदी, respond in warm, conversational Hindi.
2. Never ask them anything they already shared with you (like their name, age, or location).
3. Keep responses extremely short — maximum 3 sentences.
4. If their check-in streak ({streak_count}) is 1 or more, praise their dedication and streak achievements to encourage them.
5. If they mention severe distress, clinical symptoms, or ask for formal medical advice, gently advise them to book an appointment with their registered doctor using the shortcut button available in the chatbot screen.
6. If they express suicide or self-harm ideation, you must reply: "Please reach out to iCall at 9152987821 — they are free, confidential, and available in multiple languages."
7. You are an AI companion, not a real doctor or licensed therapist. Never diagnose conditions.
8. End every third message with a gentle check-in question like "Does talking about this feel okay?" or "How is your mood now?"
"""
    return prompt.strip()

async def generate_chat_response(
    messages_history: List[Dict[str, str]],
    patient_profile: Optional[Dict[str, Any]],
    current_streak: int = 0,
    current_mood_score: Optional[int] = None,
) -> str:
    """
    Sends chat history to Groq (or OpenAI) to generate a customized Saathi response.
    Tries multiple keys sequentially and falls back to a simulated response if all keys fail.
    """
    provider = settings.AI_PROVIDER.lower()
    keys = _get_api_keys()

    # Crisis check on last user message
    if messages_history and messages_history[-1]["role"] == "user":
        last_msg = messages_history[-1]["content"]
        if has_crisis_keywords(last_msg):
            return "I hear how much pain you're in, and I want you to be safe. Please reach out to iCall at 9152987821 — they are free, confidential, and available in multiple languages. You can also book an appointment with a doctor right now using the button on your screen."

    if not keys or provider == "mock":
        print("Using simulated Saathi chatbot response.")
        return get_mock_chatbot_reply(messages_history, patient_profile)

    url = "https://api.groq.com/openai/v1/chat/completions" if provider == "groq" else "https://api.openai.com/v1/chat/completions"
    model = "llama-3.3-70b-versatile" if provider == "groq" else "gpt-4o-mini"
    system_prompt = build_system_prompt(patient_profile, current_streak, current_mood_score)

    payload_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages_history:
        payload_messages.append({"role": msg["role"], "content": msg["content"]})

    last_error = None
    for index, api_key in enumerate(keys):
        try:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": model,
                "messages": payload_messages,
                "max_tokens": 250,
                "temperature": 0.7,
            }

            response = await http_client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            result = response.json()
            reply = result["choices"][0]["message"]["content"]
            return reply.strip()
        except Exception as e:
            print(f"Chatbot generation failed with key index {index}: {str(e)}")
            last_error = e
            continue

    print(f"All keys exhausted for chatbot. Falling back to simulated reply. Error: {str(last_error)}")
    return get_mock_chatbot_reply(messages_history, patient_profile)


def get_mock_chatbot_reply(messages_history: List[Dict[str, str]], profile: Optional[Dict[str, Any]]) -> str:
    """Fallback generator for mock responses."""
    last_msg = messages_history[-1]["content"].lower() if messages_history else ""
    name = profile.get("full_name", "friend") if profile else "friend"
    lang = profile.get("language_preference", "en") if profile else "en"

    is_hindi = "hi" in lang.lower() or "हिंदी" in lang or "hin" in lang.lower()

    if is_hindi:
        if "appointment" in last_msg or "doctor" in last_msg or "dr" in last_msg:
            return f"नमस्ते {name}, यदि आप अस्वस्थ महसूस कर रहे हैं, तो आप डॉक्टर से परामर्श कर सकते हैं। अपॉइंटमेंट बुक करने के लिए कृपया स्क्रीन पर दिए गए बटन का उपयोग करें।"
        if "sad" in last_msg or "खराब" in last_msg or "उदास" in last_msg:
            return f"मुझे दुख है कि आप ऐसा महसूस कर रहे हैं, {name}। याद रखें कि मैं यहाँ आपकी मदद के लिए हूँ। एक छोटी सी सैर करने या गहरी साँस लेने से मदद मिल सकती है।"
        return f"नमस्ते {name}, मैं आपका साथी हूँ। आप आज कैसा महसूस कर रहे हैं? मुझसे कोई भी बात साझा करने में संकोच न करें।"
    else:
        if "appointment" in last_msg or "doctor" in last_msg or "dr" in last_msg or "sick" in last_msg:
            return f"Hello {name}. If you feel like speaking with a medical professional, I highly recommend booking an appointment with a doctor. You can easily do so using the booking button right on this screen."
        if "sad" in last_msg or "low" in last_msg or "depressed" in last_msg:
            return f"I'm sorry you are feeling low, {name}. Please be gentle with yourself. Talking about it helps, and we can discuss simple exercises or morning walks to lift your spirits."
        return f"Hello {name}, I am Saathi, your companion. How are you feeling today? I am here to listen and help you feel better."
