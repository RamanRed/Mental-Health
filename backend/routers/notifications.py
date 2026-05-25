"""
Notifications Router — user alert history, status updates, and unread counts.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from typing import List

from database import get_db
from models.notification import Notification
from schemas.notification import NotificationResponse
from middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationResponse])
async def get_user_notifications(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get notifications for the currently logged in user.
    Returns unread first, sorted by created_at desc.
    """
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user["user_id"])
        .order_by(Notification.is_read.asc(), Notification.created_at.desc())
    )
    notifications = result.scalars().all()
    return [NotificationResponse.model_validate(n) for n in notifications]


@router.get("/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the count of unread notifications for the user.
    """
    result = await db.execute(
        select(func.count(Notification.id))
        .where(
            Notification.user_id == current_user["user_id"],
            Notification.is_read == False,
        )
    )
    count = result.scalar() or 0
    return {"unread_count": count}


@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def mark_as_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark a specific notification as read.
    """
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user["user_id"],
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return NotificationResponse.model_validate(notification)


@router.put("/read-all")
async def mark_all_as_read(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark all notifications for the current user as read.
    """
    await db.execute(
        update(Notification)
        .where(
            Notification.user_id == current_user["user_id"],
            Notification.is_read == False,
        )
        .values(is_read=True)
    )
    await db.commit()
    return {"status": "success", "message": "All notifications marked as read"}
