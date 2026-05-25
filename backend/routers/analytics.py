"""
Analytics Router — aggregated metrics for doctors and patients.
Provides mood trends, screening risk distributions, consultation stats,
and follow-up compliance for clinical decision support.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta, timezone
from collections import Counter

from database import get_db
from models.doctor import DoctorProfile
from models.patient import PatientProfile
from models.mood import MoodEntry, Streak
from models.screening import ScreeningResult
from models.consultation import Consultation
from models.follow_request import DoctorFollowRequest
from models.appointment import Appointment
from middleware.auth_middleware import require_doctor, require_patient, get_current_user

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _get_doctor(user_id: str, db: AsyncSession) -> DoctorProfile:
    res = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == user_id))
    doctor = res.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    return doctor


async def _get_patient(user_id: str, db: AsyncSession) -> PatientProfile:
    res = await db.execute(select(PatientProfile).where(PatientProfile.user_id == user_id))
    patient = res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return patient


def _date_range(days: int):
    """Return a UTC datetime `days` ago."""
    return datetime.now(timezone.utc) - timedelta(days=days)


# ── Doctor Analytics ──────────────────────────────────────────────────────────

@router.get("/doctor/overview")
async def doctor_overview(
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """
    High-level dashboard stats for the doctor:
    total patients, session counts, screening risk breakdown, follow-up compliance.
    """
    doctor = await _get_doctor(current_user["user_id"], db)

    # Total unique patients
    q = await db.execute(
        select(func.count(Consultation.patient_id.distinct()))
        .where(Consultation.doctor_id == doctor.id)
    )
    total_patients = q.scalar() or 0

    # Sessions by status
    sessions_res = await db.execute(
        select(Consultation.status, func.count(Consultation.id))
        .where(Consultation.doctor_id == doctor.id)
        .group_by(Consultation.status)
    )
    sessions_by_status = {row[0]: row[1] for row in sessions_res.all()}

    # Upcoming sessions (next 7 days)
    now = datetime.now(timezone.utc)
    week_ahead = now + timedelta(days=7)
    upcoming_res = await db.execute(
        select(func.count(Consultation.id)).where(
            and_(
                Consultation.doctor_id == doctor.id,
                Consultation.status == "scheduled",
                Consultation.scheduled_at >= now,
                Consultation.scheduled_at <= week_ahead,
            )
        )
    )
    upcoming_count = upcoming_res.scalar() or 0

    # Latest screening risk distribution across doctor's patients
    # Get patient ids for this doctor
    patient_ids_res = await db.execute(
        select(Consultation.patient_id.distinct())
        .where(Consultation.doctor_id == doctor.id)
    )
    patient_ids = [row[0] for row in patient_ids_res.all()]

    risk_distribution = {"low": 0, "moderate": 0, "high": 0}
    if patient_ids:
        # Most recent screening per patient
        for pid in patient_ids:
            sr_res = await db.execute(
                select(ScreeningResult.risk_level)
                .where(ScreeningResult.patient_id == pid)
                .order_by(ScreeningResult.created_at.desc())
                .limit(1)
            )
            risk = sr_res.scalar_one_or_none()
            if risk and risk in risk_distribution:
                risk_distribution[risk] += 1

    # Follow request compliance
    fr_res = await db.execute(
        select(DoctorFollowRequest.status, func.count(DoctorFollowRequest.id))
        .where(DoctorFollowRequest.doctor_id == doctor.id)
        .group_by(DoctorFollowRequest.status)
    )
    follow_stats = {row[0]: row[1] for row in fr_res.all()}

    return {
        "total_patients": total_patients,
        "sessions": {
            "scheduled": sessions_by_status.get("scheduled", 0),
            "in_progress": sessions_by_status.get("in_progress", 0),
            "completed": sessions_by_status.get("completed", 0),
            "cancelled": sessions_by_status.get("cancelled", 0),
            "upcoming_7_days": upcoming_count,
        },
        "risk_distribution": risk_distribution,
        "follow_requests": {
            "pending": follow_stats.get("pending", 0),
            "acknowledged": follow_stats.get("acknowledged", 0),
            "responded": follow_stats.get("responded", 0),
        },
    }


@router.get("/doctor/patient/{patient_id}/mood-trend")
async def doctor_patient_mood_trend(
    patient_id: str,
    days: int = Query(default=30, ge=7, le=90),
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """
    Get mood trend data for a specific patient (doctor view).
    Returns daily mood scores for the last N days.
    """
    doctor = await _get_doctor(current_user["user_id"], db)

    # Ensure this doctor has a consultation with the patient
    c_res = await db.execute(
        select(Consultation).where(
            Consultation.doctor_id == doctor.id,
            Consultation.patient_id == patient_id,
        ).limit(1)
    )
    if not c_res.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not authorized to view this patient's data")

    since = _date_range(days)
    entries_res = await db.execute(
        select(MoodEntry.created_at, MoodEntry.mood_score, MoodEntry.mood_emoji)
        .where(
            MoodEntry.patient_id == patient_id,
            MoodEntry.created_at >= since,
        )
        .order_by(MoodEntry.created_at.asc())
    )
    entries = entries_res.all()

    trend = [
        {
            "date": e[0].strftime("%Y-%m-%d"),
            "score": e[1],
            "emoji": e[2],
        }
        for e in entries
    ]

    avg_score = (
        round(sum(e["score"] for e in trend if e["score"]) / len(trend), 1)
        if trend else None
    )

    return {
        "patient_id": patient_id,
        "period_days": days,
        "total_entries": len(trend),
        "average_score": avg_score,
        "trend": trend,
    }


@router.get("/doctor/patient/{patient_id}/screening-history")
async def doctor_patient_screening_history(
    patient_id: str,
    current_user: dict = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """
    Get screening risk history for a specific patient.
    """
    doctor = await _get_doctor(current_user["user_id"], db)

    # Authorization check
    c_res = await db.execute(
        select(Consultation).where(
            Consultation.doctor_id == doctor.id,
            Consultation.patient_id == patient_id,
        ).limit(1)
    )
    if not c_res.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not authorized to view this patient's data")

    sr_res = await db.execute(
        select(ScreeningResult)
        .where(ScreeningResult.patient_id == patient_id)
        .order_by(ScreeningResult.created_at.desc())
        .limit(20)
    )
    screenings = sr_res.scalars().all()

    return {
        "patient_id": patient_id,
        "screenings": [
            {
                "id": s.id,
                "risk_level": s.risk_level,
                "trigger_type": s.trigger_type,
                "contributing_factors": s.contributing_factors,
                "summary": s.plain_language_summary,
                "reviewed": s.reviewed_by_doctor,
                "date": s.created_at.strftime("%Y-%m-%d %H:%M"),
            }
            for s in screenings
        ],
    }


# ── Patient Analytics ─────────────────────────────────────────────────────────

@router.get("/patient/mood-insights")
async def patient_mood_insights(
    days: int = Query(default=30, ge=7, le=90),
    current_user: dict = Depends(require_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Patient's personal mood analytics — trend, average, emoji distribution,
    streak info, and trait averages over the selected period.
    """
    patient = await _get_patient(current_user["user_id"], db)
    since = _date_range(days)

    entries_res = await db.execute(
        select(MoodEntry)
        .where(MoodEntry.patient_id == patient.id, MoodEntry.created_at >= since)
        .order_by(MoodEntry.created_at.asc())
    )
    entries = entries_res.scalars().all()

    # Trend
    trend = [
        {
            "date": e.created_at.strftime("%Y-%m-%d"),
            "score": e.mood_score,
            "emoji": e.mood_emoji,
        }
        for e in entries
    ]

    # Average score
    scores = [e.mood_score for e in entries if e.mood_score is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else None

    # Emoji frequency
    emojis = [e.mood_emoji for e in entries if e.mood_emoji]
    emoji_dist = dict(Counter(emojis).most_common(5))

    # Trait averages
    trait_sums: dict = {}
    trait_counts: dict = {}
    for e in entries:
        if e.traits and isinstance(e.traits, dict):
            for k, v in e.traits.items():
                if isinstance(v, (int, float)):
                    trait_sums[k] = trait_sums.get(k, 0) + v
                    trait_counts[k] = trait_counts.get(k, 0) + 1
    trait_averages = {
        k: round(trait_sums[k] / trait_counts[k], 1)
        for k in trait_sums
    }

    # Streak
    streak_res = await db.execute(select(Streak).where(Streak.patient_id == patient.id))
    streak = streak_res.scalar_one_or_none()

    return {
        "period_days": days,
        "total_entries": len(entries),
        "average_score": avg_score,
        "emoji_distribution": emoji_dist,
        "trait_averages": trait_averages,
        "current_streak": streak.current_streak if streak else 0,
        "longest_streak": streak.longest_streak if streak else 0,
        "trend": trend,
    }


@router.get("/patient/session-history")
async def patient_session_history(
    current_user: dict = Depends(require_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Patient's consultation session summary — counts by status and type.
    """
    patient = await _get_patient(current_user["user_id"], db)

    sessions_res = await db.execute(
        select(Consultation.status, Consultation.session_type, func.count(Consultation.id))
        .where(Consultation.patient_id == patient.id)
        .group_by(Consultation.status, Consultation.session_type)
    )
    rows = sessions_res.all()

    by_status: dict = {}
    by_type: dict = {}
    for status, stype, count in rows:
        by_status[status] = by_status.get(status, 0) + count
        by_type[stype] = by_type.get(stype, 0) + count

    # Most recent screening
    sr_res = await db.execute(
        select(ScreeningResult)
        .where(ScreeningResult.patient_id == patient.id)
        .order_by(ScreeningResult.created_at.desc())
        .limit(1)
    )
    latest_screening = sr_res.scalar_one_or_none()

    return {
        "sessions_by_status": by_status,
        "sessions_by_type": by_type,
        "latest_screening": {
            "risk_level": latest_screening.risk_level,
            "date": latest_screening.created_at.strftime("%Y-%m-%d"),
            "summary": latest_screening.plain_language_summary,
        } if latest_screening else None,
    }
