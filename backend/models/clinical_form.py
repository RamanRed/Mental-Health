"""
ClinicalForm model — versioned form definitions for doctor consultations.
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from database import Base


class ClinicalForm(Base):
    """
    Stores clinical form definitions with versioning.
    Doctors fill these forms during consultations; AI auto-fills from transcripts.
    """
    __tablename__ = "clinical_forms"

    id = Column(String(36), primary_key=True, index=True)
    form_name = Column(String(255), nullable=False)
    version = Column(Integer, default=1, nullable=False)
    schema_definition = Column(JSON, default=dict, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
