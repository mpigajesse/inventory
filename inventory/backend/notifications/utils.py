from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from django.contrib.auth.models import User

from .models import Notification

if TYPE_CHECKING:
    from products.models import Product
    from sales.models import Sale
    from clients.models import Client
    from stock.models import Stock

logger = logging.getLogger(__name__)


def get_admin_users() -> list[User]:
    """
    Retourne tous les utilisateurs admin :
    - is_staff=True (superutilisateurs Django)
    - ou UserProfile.role == 'admin'
    """
    staff_ids = set(
        User.objects.filter(is_staff=True, is_active=True).values_list('id', flat=True)
    )
    try:
        from users.models import UserProfile
        profile_admin_ids = set(
            UserProfile.objects.filter(role='admin', is_active=True).values_list('user_id', flat=True)
        )
        all_admin_ids = staff_ids | profile_admin_ids
    except Exception:
        all_admin_ids = staff_ids

    return list(User.objects.filter(id__in=all_admin_ids, is_active=True))


def notify_admins(
    notification_type: str,
    title: str,
    message: str,
    related_product: 'Product | None' = None,
) -> None:
    """Crée une notification pour tous les admins. Ne lève jamais d'exception."""
    try:
        admins = get_admin_users()
        notifications = [
            Notification(
                recipient=admin,
                notification_type=notification_type,
                title=title,
                message=message,
                related_product=related_product,
            )
            for admin in admins
        ]
        if notifications:
            Notification.objects.bulk_create(notifications)
    except Exception:
        logger.exception(
            "Échec de la création des notifications (type=%s, title=%r)",
            notification_type,
            title,
        )


def notify_sale(sale: 'Sale') -> None:
    """Notification nouvelle vente pour tous les admins."""
    try:
        items = list(sale.items.select_related('product').all()[:3])
        items_summary = ", ".join(
            f"{item.quantity}x {item.product.name}" for item in items
        )
        cashier_name = sale.cashier.get_full_name() or sale.cashier.username
        title = f"Nouvelle vente — {sale.total_amount:,.0f} FCFA"
        message = (
            f"Vente #{sale.pk} enregistrée par {cashier_name}. "
            f"Articles : {items_summary}. "
            f"Total : {sale.total_amount:,.0f} FCFA."
        )
        notify_admins('new_sale', title, message)
    except Exception:
        logger.exception("Échec de notify_sale (sale_id=%s)", getattr(sale, 'pk', None))


def notify_new_client(client: 'Client') -> None:
    """Notification nouveau client pour tous les admins."""
    try:
        full_name = f"{client.first_name} {client.last_name}".strip() if hasattr(client, 'first_name') else str(client)
        # Support pour le champ 'name' utilisé dans le modèle Client
        if hasattr(client, 'name'):
            full_name = client.name
        title = f"Nouveau client — {full_name}"
        message = f"Un nouveau client a été enregistré : {full_name}."
        notify_admins('new_client', title, message)
    except Exception:
        logger.exception("Échec de notify_new_client (client_id=%s)", getattr(client, 'pk', None))


def check_stock_alerts(stock: 'Stock') -> None:
    """
    Vérifie le stock après modification et crée une notification si le seuil
    bas ou critique est atteint. Ne lève jamais d'exception.
    """
    try:
        quantity = stock.quantity
        min_threshold = stock.min_threshold
        product = stock.product

        if quantity == 0:
            notify_admins(
                'stock_critical',
                f"RUPTURE — {product.name}",
                f"Le produit {product.name} est en rupture de stock (0 unités).",
                related_product=product,
            )
        elif quantity <= min_threshold:
            critical_threshold = max(1, min_threshold // 2)
            level = 'stock_critical' if quantity <= critical_threshold else 'stock_low'
            notify_admins(
                level,
                f"Stock bas — {product.name} ({quantity} unités)",
                (
                    f"Le stock de {product.name} est bas : {quantity} unité(s) restante(s) "
                    f"(seuil d'alerte : {min_threshold})."
                ),
                related_product=product,
            )
    except Exception:
        logger.exception(
            "Échec de check_stock_alerts (stock_id=%s)",
            getattr(stock, 'pk', None),
        )
