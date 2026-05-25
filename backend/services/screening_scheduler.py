"""
Screening Scheduler Service — executes batch/scheduled mental health screenings across all registered patients.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any, List

from models.patient import PatientProfile
from models.screening import ScreeningResult
from services.screening_service import run_screening


async def screen_all_active_patients(db: AsyncSession) -> List[Dict[str, Any]]:
    """
    Run diagnostic mental health screening for all registered patients in the system.
    Persists screening results to the database and dispatches caregiver notifications.
    """
    # Fetch all registered patients
    p_result = await db.execute(select(PatientProfile))
    patients = p_result.scalars().all()

    screened_results = []

    for patient in patients:
        try:
            # Execute screening diagnostics (dispatches notifications if risk is moderate/high)
            screening = await run_screening(patient.id, db)

            # Persist screening result to database
            sr = ScreeningResult(
                id=screening["id"],
                patient_id=patient.id,
                risk_level=screening["risk_level"],
                contributing_factors=screening["contributing_factors"],
                plain_language_summary=screening["plain_language_summary"],
                trigger_type="scheduled",
                reviewed_by_doctor=False,
            )
            db.add(sr)

            screened_results.append({
                "patient_id": patient.id,
                "patient_name": patient.full_name,
                "risk_level": screening["risk_level"],
                "summary": screening["plain_language_summary"]
            })
        except Exception as e:
            print(f"Failed to screen patient {patient.full_name} (ID: {patient.id}): {str(e)}")

    await db.commit()
    return screened_results
