from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from app.db.session import get_session
from app.models.auth import User
from app.models.notification import Notification, NotificationType
from app.schemas import NotificationPublic, NotificationList, NotificationMarkRead
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=NotificationList)
def get_notifications(
    limit: int = 20,
    unread_only: bool = False,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get notifications for the current user.
    Returns notifications sorted by most recent first.
    """
    # Build query
    statement = select(Notification).where(Notification.user_id == current_user.id)
    
    if unread_only:
        statement = statement.where(Notification.is_read == False)
    
    statement = statement.order_by(Notification.created_at.desc()).limit(limit)
    
    notifications = session.exec(statement).all()
    
    # Get unread count
    unread_count = session.exec(
        select(func.count(Notification.id))
        .where(Notification.user_id == current_user.id)
        .where(Notification.is_read == False)
    ).one()
    
    # Get total count
    total_count = session.exec(
        select(func.count(Notification.id))
        .where(Notification.user_id == current_user.id)
    ).one()
    
    return NotificationList(
        notifications=[NotificationPublic(**n.model_dump()) for n in notifications],
        unread_count=unread_count,
        total_count=total_count
    )


@router.get("/unread-count")
def get_unread_count(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get just the unread notification count (lightweight endpoint for polling).
    """
    unread_count = session.exec(
        select(func.count(Notification.id))
        .where(Notification.user_id == current_user.id)
        .where(Notification.is_read == False)
    ).one()
    
    return {"unread_count": unread_count}


@router.post("/mark-read")
def mark_notifications_read(
    data: NotificationMarkRead,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Mark specific notifications as read.
    """
    # Update only notifications belonging to this user
    statement = select(Notification).where(
        Notification.id.in_(data.notification_ids),
        Notification.user_id == current_user.id
    )
    
    notifications = session.exec(statement).all()
    
    for notification in notifications:
        notification.is_read = True
        session.add(notification)
    
    session.commit()
    
    return {"message": f"Marked {len(notifications)} notifications as read"}


@router.post("/mark-all-read")
def mark_all_notifications_read(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Mark all notifications as read for current user.
    """
    statement = select(Notification).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    )
    
    notifications = session.exec(statement).all()
    
    for notification in notifications:
        notification.is_read = True
        session.add(notification)
    
    session.commit()
    
    return {"message": f"Marked {len(notifications)} notifications as read"}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a specific notification.
    """
    notification = session.get(Notification, notification_id)
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    session.delete(notification)
    session.commit()
    
    return {"message": "Notification deleted"}


# Helper function to create notifications (used by other modules)
def create_notification(
    session: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: NotificationType = NotificationType.SYSTEM,
    link: Optional[str] = None
) -> Notification:
    """
    Helper function to create a notification.
    Can be imported and used by other route modules.
    """
    notification = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        link=link
    )
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification
