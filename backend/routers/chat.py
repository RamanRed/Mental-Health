"""
Saathi Chatbot Router — exposes endpoints for patient chatbot onboarding
and persistent messaging history.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
from uuid import uuid4

from database import get_db
from middleware.auth_middleware import require_patient
from models.patient import PatientProfile
from models.chat import ChatMessage
from models.mood import MoodEntry, Streak
from services.chat_service import generate_chat_response

router = APIRouter(prefix="/api/chat", tags=["Saathi Chatbot"])

# --- Request/Response schemas ---

class OnboardingProfileUpdate(BaseModel):
    reasons: List[str]
    therapist_history: str
    open_text: Optional[str] = ""

class ChatMessageResponse(BaseModel):
    role: str
    content: str
    created_at: str

    class Config:
        from_attributes = True

class SendMessageRequest(BaseModel):
    content: str

# --- Endpoints ---

@router.get("/profile")
async def get_chat_profile(
    current_user: dict = Depends(require_patient),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the logged-in patient's onboarding details."""
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.user_id == current_user["user_id"])
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found",
        )
    return {
        "reasons": profile.reasons or [],
        "therapist_history": profile.therapist_history or "",
        "open_text": profile.open_text or "",
    }


@router.put("/profile")
async def update_chat_profile(
    updates: OnboardingProfileUpdate,
    current_user: dict = Depends(require_patient),
    db: AsyncSession = Depends(get_db),
):
    """Save/update the patient's chatbot onboarding details."""
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.user_id == current_user["user_id"])
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found",
        )

    profile.reasons = updates.reasons
    profile.therapist_history = updates.therapist_history
    profile.open_text = updates.open_text

    await db.commit()
    await db.refresh(profile)
    return {"status": "success", "message": "Onboarding profile saved successfully."}


@router.get("/history", response_model=List[ChatMessageResponse])
async def get_chat_history(
    current_user: dict = Depends(require_patient),
    db: AsyncSession = Depends(get_db),
):
    """Fetch the message history for the patient."""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user["user_id"])
        .order_by(ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()
    
    return [
        ChatMessageResponse(
            role=m.role,
            content=m.content,
            created_at=m.created_at.isoformat()
        ) for m in messages
    ]


@router.post("/message")
async def send_chat_message(
    request: SendMessageRequest,
    current_user: dict = Depends(require_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Accepts a user message, stores it, triggers the Saathi AI response
    with personalized patient details, saves the reply, and returns it.
    """
    user_msg_content = request.content.strip()
    if not user_msg_content:
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    user_id = current_user["user_id"]

    # 1. Fetch patient profile
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found",
        )

    # Convert patient profile object to dict for the prompt builder
    profile_dict = {
        "full_name": profile.full_name,
        "age": profile.age,
        "gender": profile.gender,
        "language_preference": profile.language_preference,
        "village": profile.village,
        "district": profile.district,
        "reasons": profile.reasons,
        "therapist_history": profile.therapist_history,
        "open_text": profile.open_text,
    }

    # 2. Fetch daily check-in streak
    streak_result = await db.execute(
        select(Streak).where(Streak.patient_id == profile.id)
    )
    streak = streak_result.scalar_one_or_none()
    streak_count = streak.current_streak if streak else 0

    # 3. Fetch current mood score (latest entry)
    mood_result = await db.execute(
        select(MoodEntry)
        .where(MoodEntry.patient_id == profile.id)
        .order_by(MoodEntry.created_at.desc())
        .limit(1)
    )
    latest_mood = mood_result.scalar_one_or_none()
    
    # Scale mood_score from 1-10 to 1-5 to keep Saathi prompt rules clean
    mood_score_scaled = None
    if latest_mood and latest_mood.mood_score is not None:
        mood_score_scaled = max(1, round(latest_mood.mood_score / 2.0))

    # 4. Fetch last 15 messages from chat history to feed into the conversation memory
    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == user_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(15)
    )
    recent_msgs = history_result.scalars().all()
    # Reverse to restore chronological order
    recent_msgs.reverse()

    messages_history = [{"role": m.role, "content": m.content} for m in recent_msgs]

    # Save user message to database
    user_msg_id = str(uuid4())
    db_user_msg = ChatMessage(
        id=user_msg_id,
        user_id=user_id,
        role="user",
        content=user_msg_content
    )
    db.add(db_user_msg)

    # Append user message to history
    messages_history.append({"role": "user", "content": user_msg_content})

    # 5. Generate AI Response
    ai_reply_content = await generate_chat_response(
        messages_history=messages_history,
        patient_profile=profile_dict,
        current_streak=streak_count,
        current_mood_score=mood_score_scaled
    )

    # Save assistant message to database
    ai_msg_id = str(uuid4())
    db_ai_msg = ChatMessage(
        id=ai_msg_id,
        user_id=user_id,
        role="assistant",
        content=ai_reply_content
    )
    db.add(db_ai_msg)

    await db.commit()

    return {
        "reply": ai_reply_content,
        "created_at": db_ai_msg.created_at.isoformat()
    }
