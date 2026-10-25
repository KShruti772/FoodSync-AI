from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

NotificationType = Literal[
    "MATCH_ALERT",
    "RESERVATION_CONFIRMATION",
    "RESERVATION_EXPIRED",
    "DONATION_COMPLETED",
    "EXPIRY_WARNING",
    "SYSTEM",
]


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    match_id: str | None = None
    title: str
    message: str
    type: NotificationType
    is_read: bool
    created_at: datetime
