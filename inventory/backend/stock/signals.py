from __future__ import annotations

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import StockMovement

logger = logging.getLogger(__name__)


@receiver(post_save, sender=StockMovement)
def on_stock_movement_saved(
    sender: type[StockMovement],
    instance: StockMovement,
    created: bool,
    **kwargs: object,
) -> None:
    """
    Après chaque mouvement de stock, vérifie si le niveau est bas ou critique
    et envoie une notification aux admins si nécessaire.

    Uniquement sur les nouvelles entrées (created=True) pour éviter les
    notifications dupliquées lors des mises à jour.
    """
    if not created:
        return

    try:
        from notifications.utils import check_stock_alerts
        stock = instance.product.stock
        check_stock_alerts(stock)
    except Exception:
        logger.exception(
            "Échec du signal on_stock_movement_saved (movement_id=%s)",
            instance.pk,
        )
