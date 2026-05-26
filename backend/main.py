"""
MANAS Mental Health Platform — FastAPI Backend
Main application entry point. Configures CORS, includes all routers,
and creates database tables on startup.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone

from config import settings
from database import create_tables, AsyncSessionLocal
from models.clinical_form import ClinicalForm
from sqlalchemy import select

# Import all models so they register with Base.metadata
import models  # noqa: F401

from routers import auth, patients, mood, guardians, doctors, questionnaire, ai_service, notifications, appointments, video_call
from routers import transcript, follow_requests, analytics, chat


async def seed_clinical_forms():
    """Seed default clinical form templates if none exist."""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(select(ClinicalForm).limit(1))
            existing = result.scalar_one_or_none()
            if existing:
                print("Clinical form templates already exist.")
                return
            
            templates = [
                ClinicalForm(
                    id="standard_consultation",
                    form_name="Standard Consultation Form",
                    version=1,
                    is_active=True,
                    schema_definition={
                        "fields": [
                            {
                                "name": "symptom_severity",
                                "label": "Symptom Severity Score",
                                "type": "numeric_rating",
                                "min": 1,
                                "max": 10,
                                "required": True
                            },
                            {
                                "name": "sleep_pattern",
                                "label": "Sleep Pattern Observations",
                                "type": "free_text",
                                "required": True
                            },
                            {
                                "name": "cognitive_functioning",
                                "label": "Cognitive Assessment",
                                "type": "free_text",
                                "required": True
                            },
                            {
                                "name": "suicidal_risk",
                                "label": "⚠️ Safety-Critical: Suicidal Ideation / Self-Harm Risk *",
                                "type": "safety_flag",
                                "required": True,
                                "hint": "This safety-critical field must always be manually validated."
                            },
                            {
                                "name": "recommended_treatment",
                                "label": "Recommended Treatment Plan",
                                "type": "free_text",
                                "required": True
                            }
                        ]
                    }
                ),
                ClinicalForm(
                    id="phq9_assessment",
                    form_name="Depression (PHQ-9) Assessment Form",
                    version=1,
                    is_active=True,
                    schema_definition={
                        "fields": [
                            {
                                "name": "depressive_symptoms",
                                "label": "Depressive Symptoms Severity",
                                "type": "numeric_rating",
                                "min": 1,
                                "max": 10,
                                "required": True
                            },
                            {
                                "name": "sleep_duration",
                                "label": "Average Sleep Duration (Hours)",
                                "type": "numeric_rating",
                                "min": 0,
                                "max": 24,
                                "required": True
                            },
                            {
                                "name": "functioning_impairment",
                                "label": "Daily Functioning Impairment Rating",
                                "type": "numeric_rating",
                                "min": 1,
                                "max": 5,
                                "required": True
                            },
                            {
                                "name": "suicidal_risk",
                                "label": "⚠️ Safety-Critical: Suicidal Ideation / Self-Harm Risk *",
                                "type": "safety_flag",
                                "required": True,
                                "hint": "This safety-critical field must always be manually validated."
                            },
                            {
                                "name": "recommended_treatment",
                                "label": "Recommended Treatment Plan",
                                "type": "free_text",
                                "required": True
                            }
                        ]
                    }
                ),
                ClinicalForm(
                    id="gad7_assessment",
                    form_name="Anxiety (GAD-7) Assessment Form",
                    version=1,
                    is_active=True,
                    schema_definition={
                        "fields": [
                            {
                                "name": "anxiety_level",
                                "label": "Anxiety Level Rating",
                                "type": "numeric_rating",
                                "min": 1,
                                "max": 10,
                                "required": True
                            },
                            {
                                "name": "physical_tension",
                                "label": "Physical Tension & Somatic Signs",
                                "type": "free_text",
                                "required": True
                            },
                            {
                                "name": "panic_signs",
                                "label": "Cognitive Panic Signs",
                                "type": "free_text",
                                "required": True
                            },
                            {
                                "name": "suicidal_risk",
                                "label": "⚠️ Safety-Critical: Suicidal Ideation / Self-Harm Risk *",
                                "type": "safety_flag",
                                "required": True,
                                "hint": "This safety-critical field must always be manually validated."
                            },
                            {
                                "name": "recommended_treatment",
                                "label": "Recommended Treatment Plan",
                                "type": "free_text",
                                "required": True
                            }
                        ]
                    }
                )
            ]
            
            session.add_all(templates)
            await session.commit()
            print("Clinical form templates seeded successfully.")
        except Exception as e:
            print(f"Error seeding clinical form templates: {str(e)}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: create tables on startup."""
    await create_tables()
    print("Database tables created successfully")
    await seed_clinical_forms()
    yield
    print("Application shutting down")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_TITLE,
    version=settings.APP_VERSION,
    description=(
        "MANAS (Mental Health Assessment, Nurturing, and Assistance System) — "
        "A comprehensive mental health platform for rural India. "
        "Supports patients, guardians (ASHA, family, NGO, Anganwadi), and doctors."
    ),
    lifespan=lifespan,
)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(mood.router)
app.include_router(guardians.router)
app.include_router(doctors.router)
app.include_router(questionnaire.router)
app.include_router(ai_service.router)
app.include_router(notifications.router)
app.include_router(appointments.router)
app.include_router(video_call.router)
app.include_router(transcript.router)
app.include_router(follow_requests.router)
app.include_router(analytics.router)
app.include_router(chat.router)


@app.get("/api/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint.
    Returns the current server status and timestamp.
    """
    return {
        "status": "healthy",
        "service": "MANAS API",
        "version": settings.APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
