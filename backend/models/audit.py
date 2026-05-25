"""
Audit models — ConsentAuditLog and GuardianNote for transparency and accountability.
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.sql import func
from database import Base


class ConsentAuditLog(Base):
    """
    Immutable audit log for consent changes — tracks who granted/revoked what.
    """
    __tablename__ = "consent_audit_logs"

    id = Column(String(36), primary_key=True, index=True)
    patient_id = Column(String(36), ForeignKey("patient_profiles.id"), nullable=False, index=True)
    action = Column(String(100), nullable=False)  # e.g. 'granted_mood_access', 'revoked_summary_access'
    granted_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    target_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    details = Column(JSON, default=dict, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class GuardianNote(Base):
    """
    Observational notes added by guardians about a patient.
    """
    __tablename__ = "guardian_notes"

    id = Column(String(36), primary_key=True, index=True)
    patient_id = Column(String(36), ForeignKey("patient_profiles.id"), nullable=False, index=True)
    guardian_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    note_text = Column(Text, nullable=False)
    note_type = Column(String(20), nullable=False)  # observation/check_in/concern
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
