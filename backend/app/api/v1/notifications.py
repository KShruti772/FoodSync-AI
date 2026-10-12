from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_active_user
from app.schemas.notification import NotificationResponse
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationResponse])
def list_notifications(current_user: dict = Depends(get_current_active_user)):
    items = NotificationService.list_notifications(current_user["id"])
    return [NotificationResponse.model_validate(item) for item in items]


@router.patch("/{notification_id}/read")
def read_notification(notification_id: str, current_user: dict = Depends(get_current_active_user)):
    try:
        notification = NotificationService.mark_as_read(notification_id, current_user["id"])
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"success": False, "error": {"code": "FORBIDDEN", "message": str(exc), "details": []}}) from exc
    return {"success": True, "message": "Notification marked as read", "data": notification}
