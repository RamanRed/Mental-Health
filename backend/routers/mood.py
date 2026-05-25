"""
Mood Router — mood entry logging, streak tracking, and trend analysis.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import uuid4
from datetime import datetime, timedelta, timezone, date

from database import get_db
from models.patient import PatientProfile
from models.mood import MoodEntry, Streak
from schemas.mood import MoodEntryCreate, MoodEntryResponse, StreakResponse, MoodTrendResponse
from middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/mood", tags=["Mood Tracking"])


@router.post("/entry", response_model=MoodEntryResponse)
async def create_mood_entry(
    entry: MoodEntryCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new mood entry. Automatically updates the patient's streak.
    Can be filled by the patient or a guardian on their behalf.
    """
    # Determine patient_id
    patient_id = entry.patient_id
    if not patient_id:
        # If patient is logging themselves, look up their profile
        result = await db.execute(
            select(PatientProfile).where(PatientProfile.user_id == current_user["user_id"])
        )
        profile = result.scalar_one_or_none()
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient profile not found. Provide patient_id if logging on behalf.",
            )
        patient_id = profile.id

    # Create mood entry
    mood_entry = MoodEntry(
        id=str(uuid4()),
        patient_id=patient_id,
        mood_emoji=entry.mood_emoji,
        mood_score=entry.mood_score,
        text_note=entry.text_note,
        voice_note_path=entry.voice_note_path,
        traits=entry.traits,
        filled_by=current_user["user_id"],
    )
    db.add(mood_entry)

    # Update streak
    today_str = date.today().isoformat()
    yesterday_str = (date.today() - timedelta(days=1)).isoformat()

    result = await db.execute(
        select(Streak).where(Streak.patient_id == patient_id)
    )
    streak = result.scalar_one_or_none()

    if not streak:
        streak = Streak(
            id=str(uuid4()),
            patient_id=patient_id,
            current_streak=1,
            longest_streak=1,
            last_entry_date=today_str,
            milestones=[],
        )
        db.add(streak)
    else:
        if streak.last_entry_date == today_str:
            pass  # Already logged today
        elif streak.last_entry_date == yesterday_str:
            streak.current_streak += 1
            if streak.current_streak > streak.longest_streak:
                streak.longest_streak = streak.current_streak
            # Check milestones
            milestones = streak.milestones or []
            if streak.current_streak in [7, 14, 30, 60, 90, 180, 365]:
                milestones.append({
                    "streak": streak.current_streak,
                    "achieved_at": today_str,
                })
                streak.milestones = milestones
        else:
            streak.current_streak = 1  # Reset streak
        streak.last_entry_date = today_str

    await db.commit()
    await db.refresh(mood_entry)
    return MoodEntryResponse.model_validate(mood_entry)


@router.get("/entries", response_model=list[MoodEntryResponse])
async def get_entries(
    days: int = Query(default=7, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get recent mood entries for the authenticated patient."""
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.user_id == current_user["user_id"])
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found")

    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(MoodEntry)
        .where(MoodEntry.patient_id == profile.id, MoodEntry.created_at >= since)
        .order_by(MoodEntry.created_at.desc())
    )
    entries = result.scalars().all()
    return [MoodEntryResponse.model_validate(e) for e in entries]


@router.get("/streak", response_model=StreakResponse)
async def get_streak(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the authenticated patient's mood logging streak."""
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.user_id == current_user["user_id"])
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found")

    result = await db.execute(
        select(Streak).where(Streak.patient_id == profile.id)
    )
    streak = result.scalar_one_or_none()
    if not streak:
        # Return default empty streak
        return StreakResponse(
            id="none",
            patient_id=profile.id,
            current_streak=0,
            longest_streak=0,
        )
    return StreakResponse.model_validate(streak)


@router.get("/trends", response_model=MoodTrendResponse)
async def get_trends(
    days: int = Query(default=30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get mood trend data for the authenticated patient.
    Includes average score and trend direction over the specified period.
    """
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.user_id == current_user["user_id"])
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found")

    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(MoodEntry)
        .where(MoodEntry.patient_id == profile.id, MoodEntry.created_at >= since)
        .order_by(MoodEntry.created_at.asc())
    )
    entries = result.scalars().all()
    entries_response = [MoodEntryResponse.model_validate(e) for e in entries]

    # Calculate average and trend
    scores = [e.mood_score for e in entries if e.mood_score is not None]
    avg_score = sum(scores) / len(scores) if scores else None

    # Determine trend direction
    trend = "stable"
    if len(scores) >= 3:
        first_half = scores[:len(scores)//2]
        second_half = scores[len(scores)//2:]
        first_avg = sum(first_half) / len(first_half)
        second_avg = sum(second_half) / len(second_half)
        if second_avg > first_avg + 0.5:
            trend = "improving"
        elif second_avg < first_avg - 0.5:
            trend = "declining"

    return MoodTrendResponse(
        patient_id=profile.id,
        days=days,
        entries=entries_response,
        average_score=round(avg_score, 2) if avg_score else None,
        trend_direction=trend,
    )
