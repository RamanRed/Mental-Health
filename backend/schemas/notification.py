"""
Notification schemas — request/response models for user notifications.
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificationCreate(BaseModel):
    """Schema for creating a notification."""
    user_id: str
    title: str
    content: str
    type: Optional[str] = "info"


class NotificationResponse(BaseModel):
    """Schema for returning a notification."""
    id: str
    user_id: str
    title: str
    content: str
    type: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
