"""
Screening Service
Runs rule-based diagnostic analysis of patient mood logs and questionnaire responses
to classify risk level and identify contributing clinical factors.
"""

from uuid import uuid4
from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.questionnaire import QuestionnaireResponse
from models.mood import MoodEntry
from models.patient import PatientProfile
from models.doctor import DoctorProfile
from models.consultation import Consultation

async def run_screening(patient_id: str, db: AsyncSession) -> Dict[str, Any]:
    """
    Run diagnostic screening analysis based on actual database logs.
    Classifies risk level as low, moderate, or high based on mood scores
    and critical questionnaire questions (such as self-harm).
    """
    # Fetch Patient Profile
    p_result = await db.execute(
        select(PatientProfile).where(PatientProfile.id == patient_id)
    )
    patient = p_result.scalar_one_or_none()

    # 1. Fetch Questionnaire Responses
    q_result = await db.execute(
        select(QuestionnaireResponse)
        .where(QuestionnaireResponse.patient_id == patient_id)
        .order_by(QuestionnaireResponse.created_at.desc())
    )
    questionnaires = q_result.scalars().all()

    # 2. Fetch Mood Entries
    m_result = await db.execute(
        select(MoodEntry)
        .where(MoodEntry.patient_id == patient_id)
        .order_by(MoodEntry.created_at.desc())
    )
    mood_entries = m_result.scalars().all()

    risk_level = "low"
    contributing_factors: List[Dict[str, Any]] = []
    
    # 3. Analyze Questionnaire Responses
    has_self_harm_thought = False
    
    for qr in questionnaires:
        questions_list = qr.questions or []
        for q in questions_list:
            q_text = q.get("question", "").lower()
            q_ans = q.get("answer", "").lower()
            
            # Check for critical self-harm questions
            if ("harm" in q_text or "suicide" in q_text or "kill" in q_text) and q_ans == "yes":
                has_self_harm_thought = True

    if has_self_harm_thought:
        risk_level = "high"
        contributing_factors.append({
            "factor": "self_harm_risk",
            "severity": "high",
            "description": "Patient reported thoughts of self-harm or self-injury in questionnaire."
        })

    # 4. Analyze Mood Entries
    if mood_entries:
        scores = [me.mood_score for me in mood_entries if me.mood_score is not None]
        if scores:
            avg_mood = sum(scores) / len(scores)
            
            if avg_mood < 3.5:
                risk_level = "high"
                contributing_factors.append({
                    "factor": "mood_quality",
                    "severity": "severe",
                    "description": f"Extremely depressed mood (average score {avg_mood:.1f}/10 over {len(scores)} logs)."
                })
            elif avg_mood < 5.5:
                if risk_level != "high":
                    risk_level = "moderate"
                contributing_factors.append({
                    "factor": "mood_quality",
                    "severity": "moderate",
                    "description": f"Sub-optimal average mood score ({avg_mood:.1f}/10 over {len(scores)} logs)."
                })
        
        # Analyze sleep quality and stress from traits
        sleep_qualities = []
        stress_levels = []
        for me in mood_entries:
            if me.traits:
                if "sleep_quality" in me.traits:
                    sleep_qualities.append(me.traits["sleep_quality"])
                if "stress" in me.traits:
                    stress_levels.append(me.traits["stress"])
                    
        if sleep_qualities:
            avg_sleep = sum(sleep_qualities) / len(sleep_qualities)
            if avg_sleep < 4.0:
                contributing_factors.append({
                    "factor": "sleep_quality",
                    "severity": "severe" if avg_sleep < 3.0 else "moderate",
                    "description": f"Severe sleep disturbances reported (average quality {avg_sleep:.1f}/10)."
                })
                
        if stress_levels:
            avg_stress = sum(stress_levels) / len(stress_levels)
            if avg_stress > 7.0:
                if risk_level == "low":
                    risk_level = "moderate"
                contributing_factors.append({
                    "factor": "stress_levels",
                    "severity": "severe" if avg_stress > 8.5 else "moderate",
                    "description": f"Elevated daily stress levels (average stress {avg_stress:.1f}/10)."
                })
    else:
        # Default low-risk description if no logs exist yet
        pass

    # Fallback default factor if empty
    if not contributing_factors:
        contributing_factors.append({
            "factor": "baseline",
            "severity": "low",
            "description": "No active risk factors or clinical disturbances identified."
        })

    # 5. Generate plain-language summary
    if risk_level == "high":
        summary = (
            "CRITICAL HEALTH ASSESSMENT: The diagnostic analysis indicates a HIGH risk level. "
            "A safety-critical trigger has been flagged due to reported self-harm thoughts or "
            "severe mood depression. Immediate clinical evaluation and guardian alert coordination are recommended."
        )
    elif risk_level == "moderate":
        summary = (
            "MODERATE RISK ASSESSMENT: The patient exhibits signs of moderate distress, sub-optimal sleep quality, "
            "or elevated stress levels. Close caregiver supervision by the designated ASHA/family guardian "
            "and scheduling a clinical consultation check-in are recommended."
        )
    else:
        summary = (
            "LOW RISK ASSESSMENT: Patient status appears stable. Mood logs and questionnaire responses "
            "are within healthy ranges. Regular wellness tracking and preventive care engagement should be maintained."
        )

    # Dispatch notifications if moderate or high risk is flagged
    if risk_level in ["moderate", "high"] and patient:
        from services.notification_service import create_notification
        
        # 1. Notify Patient
        try:
            p_msg = "Your wellness indicators suggest some distress. Try to stay in touch with your ASHA worker." if risk_level == "moderate" else "Please contact your ASHA worker or doctor immediately. We are here to help."
            await create_notification(
                user_id=patient.user_id,
                title=f"Wellness Notification: {risk_level.capitalize()} Risk Flagged",
                content=f"Your wellness assessment indicates a {risk_level} risk level. {p_msg}",
                notification_type="wellness_alert",
                db=db
            )
        except Exception as e:
            print(f"Failed to notify patient: {str(e)}")

        # 2. Notify Guardian 1 (family)
        if patient.guardian1_id:
            try:
                await create_notification(
                    user_id=patient.guardian1_id,
                    title=f"Caregiver Alert: {patient.full_name}",
                    content=f"The latest mental health assessment for {patient.full_name} has flagged a {risk_level} risk level. Please check in with them.",
                    notification_type="guardian_alert",
                    db=db
                )
            except Exception as e:
                print(f"Failed to notify Guardian 1: {str(e)}")

        # 3. Notify Guardian 2 (ASHA / NGO)
        if patient.guardian2_id:
            try:
                await create_notification(
                    user_id=patient.guardian2_id,
                    title=f"ASHA Worker Alert: {patient.full_name}",
                    content=f"The regional health screening for {patient.full_name} has flagged a {risk_level} risk level. Please schedule a routine check-in.",
                    notification_type="asha_alert",
                    db=db
                )
            except Exception as e:
                print(f"Failed to notify Guardian 2: {str(e)}")

        # 4. Notify Doctors in patient's history queue
        try:
            doc_query = await db.execute(
                select(DoctorProfile.user_id)
                .join(Consultation, Consultation.doctor_id == DoctorProfile.id)
                .where(Consultation.patient_id == patient_id)
                .distinct()
            )
            doctor_user_ids = [row[0] for row in doc_query.all()]
            for doc_uid in doctor_user_ids:
                await create_notification(
                    user_id=doc_uid,
                    title=f"Clinical Triage Alert: {patient.full_name}",
                    content=f"Patient {patient.full_name} in your queue has been flagged with a {risk_level} risk level in their latest screening.",
                    notification_type="clinical_alert",
                    db=db
                )
        except Exception as e:
            print(f"Failed to notify linked doctors: {str(e)}")

    return {
        "id": str(uuid4()),
        "patient_id": patient_id,
        "risk_level": risk_level,
        "contributing_factors": {f["factor"]: f["description"] for f in contributing_factors},
        "plain_language_summary": summary,
        "trigger_type": "on_demand",
        "reviewed_by_doctor": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
