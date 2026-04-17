from __future__ import annotations
from typing import Optional
from django.contrib.auth.models import User
from .models import ActivityLog


def log_activity(
    user: Optional[User],
    action: str,
    target_model: str = '',
    target_id: Optional[int] = None,
    description: str = '',
    request=None,
) -> ActivityLog:
    """Log a user action to the ActivityLog table.

    action must be one of: login, logout, create, update, delete, sale,
    stock_in, stock_out, print, export
    """
    ip: Optional[str] = None
    if request is not None:
        forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
        if forwarded:
            ip = forwarded.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
    return ActivityLog.objects.create(
        user=user,
        action=action,
        target_model=target_model,
        target_id=target_id,
        description=description,
        ip_address=ip,
    )
