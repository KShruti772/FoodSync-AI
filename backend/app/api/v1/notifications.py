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


@router.get("/unread-count")
def get_unread_count(current_user: dict = Depends(get_current_active_user)):
    count = NotificationService.get_unread_count(current_user["id"])
    return {"success": True, "unread_count": count}


@router.patch("/read-all")
def mark_all_as_read(current_user: dict = Depends(get_current_active_user)):
    count = NotificationService.mark_all_as_read(current_user["id"])
    return {"success": True, "message": f"Marked {count} notifications as read", "updated_count": count}


@router.get("/{notification_id}", response_model=NotificationResponse)
def get_notification(notification_id: str, current_user: dict = Depends(get_current_active_user)):
    try:
        item = NotificationService.get_notification(notification_id, current_user["id"])
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"success": False, "error": {"code": "FORBIDDEN", "message": str(exc), "details": []}},
        ) from exc
    except ValueError as exc:
        msg = str(exc)
        status_code = status.HTTP_403_FORBIDDEN if "access" in msg.lower() else status.HTTP_404_NOT_FOUND
        error_code = "FORBIDDEN" if "access" in msg.lower() else "NOT_FOUND"
        raise HTTPException(
            status_code=status_code,
            detail={"success": False, "error": {"code": error_code, "message": msg, "details": []}},
        ) from exc
    return NotificationResponse.model_validate(item)


@router.patch("/{notification_id}/read")
def read_notification(notification_id: str, current_user: dict = Depends(get_current_active_user)):
    try:
        notification = NotificationService.mark_as_read(notification_id, current_user["id"])
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"success": False, "error": {"code": "FORBIDDEN", "message": str(exc), "details": []}},
        ) from exc
    except ValueError as exc:
        msg = str(exc)
        status_code = status.HTTP_403_FORBIDDEN if "access" in msg.lower() else status.HTTP_404_NOT_FOUND
        error_code = "FORBIDDEN" if "access" in msg.lower() else "NOT_FOUND"
        raise HTTPException(
            status_code=status_code,
            detail={"success": False, "error": {"code": error_code, "message": msg, "details": []}},
        ) from exc
    return {"success": True, "message": "Notification marked as read", "data": notification}


@router.patch("/{notification_id}/unread")
def unread_notification(notification_id: str, current_user: dict = Depends(get_current_active_user)):
    try:
        notification = NotificationService.mark_as_unread(notification_id, current_user["id"])
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"success": False, "error": {"code": "FORBIDDEN", "message": str(exc), "details": []}},
        ) from exc
    except ValueError as exc:
        msg = str(exc)
        status_code = status.HTTP_403_FORBIDDEN if "access" in msg.lower() else status.HTTP_404_NOT_FOUND
        error_code = "FORBIDDEN" if "access" in msg.lower() else "NOT_FOUND"
        raise HTTPException(
            status_code=status_code,
            detail={"success": False, "error": {"code": error_code, "message": msg, "details": []}},
        ) from exc
    return {"success": True, "message": "Notification marked as unread", "data": notification}
