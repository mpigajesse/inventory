from __future__ import annotations

from django.contrib.auth.models import User


def notify_admin_of_vendeur_event(activity_log) -> None:
    """
    Create Notification objects for all admin users when a vendeur performs
    a noteworthy action recorded in the given ActivityLog instance.

    Called from activity/signals.py after the ActivityLog row is saved.
    The entire function is wrapped in a broad try/except so it never
    interrupts the main request flow.
    """
    try:
        from notifications.models import Notification

        action: str = activity_log.action or ""
        target_model: str = activity_log.target_model or ""
        description: str = activity_log.description or ""
        username: str = (
            activity_log.user.username if activity_log.user else "Utilisateur inconnu"
        )

        # Determine whether this event is worth notifying and build the payload.
        title: str | None = None
        message: str | None = None
        notification_type: str | None = None

        if action == "login":
            title = "Vendeur connecté"
            message = f"{username} vient de se connecter."
            notification_type = "system"

        elif action == "sale":
            title = "Nouvelle vente"
            message = description if description else f"Vente effectuée par {username}."
            notification_type = "new_sale"

        elif action == "create" and target_model in ("Client", "Invoice"):
            if target_model == "Client":
                title = "Nouveau client"
                message = (
                    description
                    if description
                    else f"Nouveau client créé par {username}."
                )
                notification_type = "new_client"
            else:  # Invoice
                title = "Nouvelle facture"
                message = (
                    description
                    if description
                    else f"Nouvelle facture créée par {username}."
                )
                notification_type = "new_sale"

        # Nothing to notify for other actions.
        if title is None:
            return

        admins = User.objects.filter(profile__role="admin").select_related("profile")

        notifications = [
            Notification(
                recipient=admin,
                notification_type=notification_type,
                title=title,
                message=message,
            )
            for admin in admins
        ]

        if notifications:
            Notification.objects.bulk_create(notifications)

    except Exception:
        pass
