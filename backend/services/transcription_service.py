"""
Transcription and AI Service
Phase 2: Real integrations with Groq and OpenAI API for ASR, form auto-fill, and summarization.
Supports rotation of comma-separated API keys, trying alternative keys if one fails or is exhausted.
Gracefully falls back to mock responses if all keys fail or are missing.
"""

import os
import json
import httpx
from typing import Dict, Any, Optional
from config import settings

# Global HTTPX Client for connection pooling
http_client = httpx.AsyncClient(timeout=60.0)


def _get_api_keys(provider: str) -> list:
    """Helper to parse comma-separated API keys from config/environment."""
    if provider == "groq" and settings.GROQ_API_KEY:
        return [k.strip() for k in settings.GROQ_API_KEY.split(",") if k.strip()]
    elif provider == "openai" and settings.OPENAI_API_KEY:
        return [k.strip() for k in settings.OPENAI_API_KEY.split(",") if k.strip()]
    return []


async def transcribe_audio(audio_path: str) -> str:
    """
    Transcribe audio from a consultation recording using Groq or OpenAI Whisper.
    Tries multiple keys sequentially in case of rate limits or failures.
    """
    provider = settings.AI_PROVIDER.lower()
    keys = _get_api_keys(provider)

    if not keys:
        print(f"No API keys configured for provider {provider}. Falling back to simulated transcript.")
        return get_mock_transcript()

    if not os.path.exists(audio_path):
        print(f"Audio file not found at {audio_path}. Falling back to simulated transcript.")
        return get_mock_transcript()

    url = "https://api.groq.com/openai/v1/audio/transcriptions" if provider == "groq" else "https://api.openai.com/v1/audio/transcriptions"
    model = "whisper-large-v3" if provider == "groq" else "whisper-1"

    last_error = None
    for index, api_key in enumerate(keys):
        try:
            print(f"Attempting transcription using key index {index}...")
            headers = {"Authorization": f"Bearer {api_key}"}
            
            with open(audio_path, "rb") as f:
                files = {"file": (os.path.basename(audio_path), f, "audio/mpeg")}
                data = {"model": model}
                
                response = await http_client.post(url, headers=headers, files=files, data=data)
                response.raise_for_status()
                result = response.json()
                return result.get("text", "")
        except Exception as e:
            print(f"Transcription failed for key index {index}: {str(e)}")
            last_error = e
            continue

    print(f"All ASR keys exhausted. Last error: {str(last_error)}. Falling back to simulated transcript.")
    return get_mock_transcript()


async def auto_fill_form(transcript: str, form_schema: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Use LLM to extract clinical parameters from a transcript and auto-fill the form schema.
    Tries multiple keys sequentially in case of rate limits or failures.
    """
    provider = settings.AI_PROVIDER.lower()
    keys = _get_api_keys(provider)

    if not keys:
        print(f"No API keys configured for provider {provider}. Falling back to simulated form data.")
        return get_mock_form_data(form_schema)

    url = "https://api.groq.com/openai/v1/chat/completions" if provider == "groq" else "https://api.openai.com/v1/chat/completions"
    model = "llama-3.3-70b-versatile" if provider == "groq" else "gpt-4o-mini"

    # Dynamically build target schema JSON structure
    if form_schema and isinstance(form_schema, dict) and "fields" in form_schema:
        fields = form_schema["fields"]
        schema_desc = {}
        for f in fields:
            name = f.get("name")
            label = f.get("label", name)
            ftype = f.get("type", "free_text")
            
            if name == "suicidal_risk":
                schema_desc[name] = "MUST ALWAYS BE SET TO: 'Requires manual validation'"
            elif ftype == "numeric_rating":
                min_val = f.get("min", 1)
                max_val = f.get("max", 10)
                schema_desc[name] = f"Numeric rating score from {min_val} to {max_val} representing {label}"
            elif ftype == "checkbox_group":
                options = f.get("options", [])
                schema_desc[name] = f"Array of selected symptoms/options from: {options}"
            else:
                schema_desc[name] = f"Details about {label} extracted from transcript"
                
        schema_json_str = json.dumps(schema_desc, indent=2)
    else:
        schema_json_str = (
            "{\n"
            '  "symptom_severity": "Score (e.g. 6/10) or text describing intensity",\n'
            '  "sleep_pattern": "Detail sleep quality, insomnia, hours, etc. from transcript",\n'
            '  "cognitive_functioning": "Coherence, attention, anxiety level observed in voice",\n'
            '  "suicidal_risk": "MUST ALWAYS BE SET TO: \'Requires manual validation\'",\n'
            '  "recommended_treatment": "Therapies, mindfulness, homework, exercises discussed"\n'
            "}"
        )

    system_prompt = (
        "You are an expert clinical psychologist assistant. Your task is to analyze the mental health consultation "
        "transcript provided and extract key details to fill out the following clinical form.\n\n"
        f"FORM SCHEMA TO GENERATE:\n{schema_json_str}\n\n"
        "CRITICAL SAFETY RULE:\n"
        "The 'suicidal_risk' field is safety-critical. Never attempt to automate this assessment. You MUST "
        "populate it with the literal string 'Requires manual validation' in all outputs.\n\n"
        "Return ONLY a valid JSON object matching the above schema. Do not include markdown code block formatting."
    )

    last_error = None
    for index, api_key in enumerate(keys):
        try:
            print(f"Attempting form auto-fill using key index {index}...")
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Transcript:\n{transcript}"}
                ],
                "temperature": 0.1,
                "response_format": {"type": "json_object"}
            }

            response = await http_client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            result = response.json()
            
            content = result["choices"][0]["message"]["content"]
            form_data = json.loads(content)
            
            # Enforce safety-critical rule programmatically in case LLM deviated
            if "suicidal_risk" in form_data or (form_schema and any(f.get("name") == "suicidal_risk" for f in form_schema.get("fields", []))):
                form_data["suicidal_risk"] = "Requires manual validation"
            return form_data
        except Exception as e:
            print(f"Auto-fill failed for key index {index}: {str(e)}")
            last_error = e
            continue

    print(f"All completion keys exhausted for form auto-fill. Last error: {str(last_error)}. Falling back to simulated form data.")
    return get_mock_form_data(form_schema)


async def generate_summary(
    form_data: Optional[Dict[str, Any]] = None,
    transcript: Optional[str] = None,
) -> str:
    """
    Generate a simple, plain-language patient consultation summary from clinical data and/or transcript.
    Tries multiple keys sequentially in case of rate limits or failures.
    """
    provider = settings.AI_PROVIDER.lower()
    keys = _get_api_keys(provider)

    if not keys:
        print(f"No API keys configured for provider {provider}. Falling back to simulated summary.")
        return get_mock_summary()

    url = "https://api.groq.com/openai/v1/chat/completions" if provider == "groq" else "https://api.openai.com/v1/chat/completions"
    model = "llama-3.3-70b-versatile" if provider == "groq" else "gpt-4o-mini"

    system_prompt = (
        "You are a helpful mental health assistant. Generate a plain-language summary of a doctor-patient consultation. "
        "The summary should be supportive, written in simple and clear terms, and suitable for the patient "
        "and their family guardians to read. Focus on general updates, mood improvements, sleep tracking progress, "
        "and the recommended wellness activities. Keep it concise (1 paragraph, under 100 words)."
    )

    context = f"Transcript:\n{transcript}\n\nClinical Form Data:\n{json.dumps(form_data)}"

    last_error = None
    for index, api_key in enumerate(keys):
        try:
            print(f"Attempting summary generation using key index {index}...")
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": context}
                ],
                "temperature": 0.5
            }

            response = await http_client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            result = response.json()
            
            summary = result["choices"][0]["message"]["content"]
            return summary.strip()
        except Exception as e:
            print(f"Summary generation failed for key index {index}: {str(e)}")
            last_error = e
            continue

    print(f"All completion keys exhausted for summary. Last error: {str(last_error)}. Falling back to simulated summary.")
    return get_mock_summary()


# --- Fallback Mock Data Providers ---

def get_mock_transcript() -> str:
    return (
        "Doctor: Good morning. How have you been feeling this week?\n"
        "Patient: I've been feeling a bit better. The sleep has improved somewhat.\n"
        "Doctor: That's good to hear. Are you still experiencing the anxiety episodes?\n"
        "Patient: They happen sometimes, but less frequently. Maybe twice this week.\n"
        "Doctor: And how about your appetite and daily activities?\n"
        "Patient: Appetite is normal. I've started going for walks in the morning.\n"
        "Doctor: Excellent. That's very positive progress. Let's continue the current approach."
    )


def get_mock_form_data(form_schema: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if not form_schema or not isinstance(form_schema, dict) or "fields" not in form_schema:
        return {
            "symptom_severity": "Moderate (4/10)",
            "sleep_pattern": "Improved - sleeping approx. 6 hours with morning walks",
            "cognitive_functioning": "Coherent, minor anxious moments reported",
            "suicidal_risk": "Requires manual validation",  # Safety-critical field
            "recommended_treatment": "Continue current counselor session route and keep up morning walks",
        }
        
    mock_data = {}
    for f in form_schema["fields"]:
        name = f.get("name")
        ftype = f.get("type", "free_text")
        label = f.get("label", name)
        
        if name == "suicidal_risk":
            mock_data[name] = "Requires manual validation"
        elif ftype == "numeric_rating":
            mock_data[name] = f"5/{f.get('max', 10)}"
        elif ftype == "checkbox_group":
            options = f.get("options", [])
            mock_data[name] = options[:2] if options else []
        else:
            mock_data[name] = f"Simulated details for {label}."
            
    return mock_data


def get_mock_summary() -> str:
    return (
        "Patient reports overall improvement in mental health status. Sleep quality has improved "
        "compared to the previous session. Anxiety episodes have reduced from daily to approximately "
        "twice per week. Appetite is normal and patient has initiated regular physical activity "
        "(morning walks). No significant risk indicators identified. Recommendation: continue "
        "current treatment plan with follow-up in 2 weeks."
    )
