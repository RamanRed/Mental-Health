# MANAS WhatsApp AI Mental Health Assistant

## Architecture

```text
WhatsApp
  -> Twilio WhatsApp Sandbox
  -> ngrok public HTTPS URL
  -> Flask /whatsapp
  -> language detection
  -> IndicTrans2 translation to English
  -> emotion detection
  -> crisis detection
  -> memory and mood retrieval
  -> Groq or local LLM response
  -> translate back to user language
  -> SQLite mood and conversation storage
  -> Twilio MessagingResponse
  -> WhatsApp reply
```

The Windows project already has `backend/database.py` for the FastAPI app, so the WhatsApp-specific schema lives in:

```text
backend/whatsapp_bot/database/
```

## Files

```text
backend/
  app.py
  config.py
  services/
    llm_service.py
    translation_service.py
    emotion_service.py
    journaling_service.py
    memory_service.py
    crisis_service.py
  whatsapp_bot/
    database/
      database.py
      models.py
  requirements.txt
  .env.example
```

## Setup

```powershell
cd E:\mentalHealth\Mental-Health\backend
..\venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Add your keys to `.env`:

```env
GROQ_API_KEY=your_groq_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
AI_PROVIDER=groq
GROQ_MODEL=llama-3.1-8b-instant
```

The WhatsApp assistant uses the Groq Python SDK for fast hosted LLM responses and falls back to local/template responses if Groq is unavailable.

## Run Flask

```powershell
python app.py
```

Local health check:

```powershell
curl http://127.0.0.1:5000/health
```

## Run ngrok

```powershell
ngrok config add-authtoken YOUR_NGROK_AUTHTOKEN
ngrok http 5000
```

Copy the HTTPS forwarding URL and configure Twilio Sandbox:

```text
When a message comes in:
https://<ngrok-url>/whatsapp
Method: POST
```

## Database Schema

`mood_entries`

- `user_id`
- `timestamp`
- `raw_message`
- `normalized_message`
- `language`
- `emotion`
- `confidence`
- `mood_score`
- `stress_trigger`

`conversation_messages`

- `user_id`
- `timestamp`
- `role`
- `content`
- `language`
- `emotion`

`journal_entries`

- `user_id`
- `entry_date`
- `timestamp`
- `raw_text`
- `analysis_json`

## Journaling

Send:

```text
journal
```

The bot asks:

```text
How was your day today? Write 4-5 things you felt today.
```

Then send:

```text
journal: I felt tired after exams. I was grateful my friend called me...
```

The bot returns structured JSON with mood, positive events, negative events, stress triggers, gratitude signals, and risk level.

## Local Models

By default:

```env
ENABLE_HEAVY_MODELS=False
```

This keeps the app runnable on normal laptops using lightweight fallbacks. To load HuggingFace emotion, local LLM, and IndicTrans2 models:

```env
ENABLE_HEAVY_MODELS=True
AI_PROVIDER=local
```

The IndicTrans2 model names are configured in `config.py`:

```text
ai4bharat/indictrans2-indic-en-1B
ai4bharat/indictrans2-en-indic-1B
```
