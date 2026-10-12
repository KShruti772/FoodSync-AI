from __future__ import annotations

from typing import Any

from app.core.store import store


class NotificationService:
    @staticmethod
    def list_notifications(user_id: str) -> list[dict[str, Any]]:
        return sorted(
            [item for item in store.notifications.values() if item["user_id"] == user_id],
            key=lambda item: item["created_at"],
            reverse=True,
        )

    @staticmethod
    def mark_as_read(notification_id: str, user_id: str) -> dict[str, Any]:
        notification = store.notifications.get(notification_id)
        if notification is None:
            raise ValueError("Notification not found")
        if notification["user_id"] != user_id:
            raise ValueError("You cannot access this notification")
        notification["is_read"] = True
        store.sync_notifications()
        return notification
