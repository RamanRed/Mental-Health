"""
Notification Service — handles dispatching notifications to database.
"""
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from models.notification import Notification


async def create_notification(
    user_id: str,
    title: str,
    content: str,
    notification_type: str,
    db: AsyncSession,
) -> Notification:
    """
    Create a notification in the database for a specific user.
    """
    notification = Notification(
        id=str(uuid4()),
        user_id=user_id,
        title=title,
        content=content,
        type=notification_type,
        is_read=False,
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    return notification
