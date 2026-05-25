"""
ClinicalForm schemas — Pydantic models for versioned clinical form definitions.
"""

from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from datetime import datetime


class ClinicalFormResponse(BaseModel):
    """Clinical form template response."""
    id: str
    form_name: str
    version: int
    schema_definition: Dict[str, Any]
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
