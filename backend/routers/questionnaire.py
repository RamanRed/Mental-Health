"""
Questionnaire Router — save/retrieve questionnaire responses and domain definitions.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import uuid4

from database import get_db
from models.questionnaire import QuestionnaireResponse as QuestionnaireModel
from schemas.questionnaire import QuestionnaireCreate, QuestionnaireResponseSchema, DomainDefinition
from middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/questionnaire", tags=["Questionnaire"])

# 8 Questionnaire Domain Definitions
DOMAIN_DEFINITIONS = [
    DomainDefinition(
        domain="overall_wellbeing",
        title="Overall Well-being",
        description="General mental and physical well-being assessment",
        questions=[
            "How would you rate your overall well-being in the past week?",
            "Have you been able to enjoy your daily activities?",
            "Do you feel hopeful about the future?",
            "How would you rate your energy levels?",
        ],
    ),
    DomainDefinition(
        domain="psychological",
        title="Psychological Health",
        description="Assessment of psychological symptoms and functioning",
        questions=[
            "How often have you felt anxious or worried?",
            "Have you experienced persistent sadness or low mood?",
            "Do you have trouble concentrating on tasks?",
            "Have you experienced sudden mood changes?",
        ],
    ),
    DomainDefinition(
        domain="trauma",
        title="Trauma & Adverse Experiences",
        description="Screening for trauma history and its impact",
        questions=[
            "Have you experienced any distressing events recently?",
            "Do you have recurring memories or flashbacks of past events?",
            "Do you avoid places or situations that remind you of difficult experiences?",
            "Do you feel on edge or easily startled?",
        ],
    ),
    DomainDefinition(
        domain="social",
        title="Social Relationships",
        description="Quality of social connections and support",
        questions=[
            "Do you have someone you can talk to about your problems?",
            "How satisfied are you with your relationships?",
            "Do you feel isolated or lonely?",
            "Have you had conflicts with family or community members?",
        ],
    ),
    DomainDefinition(
        domain="physical",
        title="Physical Health",
        description="Physical health and its impact on mental well-being",
        questions=[
            "How would you rate your physical health?",
            "Have you experienced unexplained aches or pains?",
            "How is your appetite?",
            "Do you have any chronic health conditions?",
        ],
    ),
    DomainDefinition(
        domain="sleep",
        title="Sleep Quality",
        description="Assessment of sleep patterns and quality",
        questions=[
            "How many hours do you typically sleep?",
            "Do you have difficulty falling asleep?",
            "Do you wake up frequently during the night?",
            "Do you feel rested when you wake up?",
        ],
    ),
    DomainDefinition(
        domain="substance_use",
        title="Substance Use",
        description="Screening for substance use patterns",
        questions=[
            "Do you consume alcohol? If so, how often?",
            "Do you use tobacco or other substances?",
            "Has substance use caused problems in your life?",
            "Have you tried to reduce substance use but found it difficult?",
        ],
    ),
    DomainDefinition(
        domain="daily_functioning",
        title="Daily Functioning",
        description="Ability to perform daily activities and responsibilities",
        questions=[
            "Are you able to perform your daily work/responsibilities?",
            "Do you participate in community or social activities?",
            "Are you able to take care of personal hygiene and needs?",
            "Do you find it difficult to make decisions?",
        ],
    ),
]


@router.post("/", response_model=QuestionnaireResponseSchema)
async def save_questionnaire(
    questionnaire: QuestionnaireCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Save a questionnaire response. Supports partial completion —
    set completed=false to save progress, true when all questions are answered.
    """
    response = QuestionnaireModel(
        id=str(uuid4()),
        patient_id=questionnaire.patient_id,
        filled_by=current_user["user_id"],
        domain=questionnaire.domain,
        questions=questionnaire.questions,
        completed=questionnaire.completed,
    )
    db.add(response)
    await db.commit()
    await db.refresh(response)

    return QuestionnaireResponseSchema.model_validate(response)


@router.get("/{patient_id}", response_model=list[QuestionnaireResponseSchema])
async def get_questionnaire_responses(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all questionnaire responses for a patient."""
    result = await db.execute(
        select(QuestionnaireModel)
        .where(QuestionnaireModel.patient_id == patient_id)
        .order_by(QuestionnaireModel.created_at.desc())
    )
    responses = result.scalars().all()
    return [QuestionnaireResponseSchema.model_validate(r) for r in responses]


@router.get("/domains", response_model=list[DomainDefinition])
async def get_domains():
    """
    Return the 8 questionnaire domain definitions with sample questions.
    These define the structure for the questionnaire screens.
    """
    return DOMAIN_DEFINITIONS
