"""
Django post_save / post_delete signals that auto-log audit events for the
core business models: Sale, Client, Invoice, Product.

Every handler is wrapped in try/except so a logging failure can never
block or roll back the originating database operation.
"""
from __future__ import annotations

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver


# ---------------------------------------------------------------------------
# Sale
# ---------------------------------------------------------------------------

@receiver(post_save, sender='sales.Sale')
def log_sale_created(sender, instance, created: bool, **kwargs) -> None:
    """Log a new sale.  Items are not yet attached at post_save time, so we
    use a fixed description rather than trying to count them via the M2M
    reverse relation."""
    if not created:
        return
    try:
        from .utils import log_activity
        log_activity(
            user=instance.cashier,
            action='sale',
            target_model='Sale',
            target_id=instance.pk,
            description=f"Vente #{instance.pk} enregistrée — {instance.total_amount} FCFA",
        )
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------

@receiver(post_save, sender='clients.Client')
def log_client_saved(sender, instance, created: bool, **kwargs) -> None:
    """Log client creation or update.  Client has no user FK so we pass
    user=None; the view layer should call log_activity directly when it wants
    to attach the request user."""
    try:
        from .utils import log_activity
        if created:
            log_activity(
                user=None,
                action='create',
                target_model='Client',
                target_id=instance.pk,
                description=f"Nouveau client ajouté : {instance.name}",
            )
        else:
            log_activity(
                user=None,
                action='update',
                target_model='Client',
                target_id=instance.pk,
                description=f"Client modifié : {instance.name}",
            )
    except Exception:
        pass


@receiver(post_delete, sender='clients.Client')
def log_client_deleted(sender, instance, **kwargs) -> None:
    try:
        from .utils import log_activity
        log_activity(
            user=None,
            action='delete',
            target_model='Client',
            target_id=instance.pk,
            description=f"Client supprimé : {instance.name}",
        )
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Invoice
# ---------------------------------------------------------------------------

@receiver(post_save, sender='invoices.Invoice')
def log_invoice_saved(sender, instance, created: bool, **kwargs) -> None:
    """Log invoice creation.  Use issued_by (the User FK on Invoice itself)
    as the actor; fall back to instance.sale.cashier if issued_by is None."""
    if not created:
        return
    try:
        from .utils import log_activity

        user = instance.issued_by
        if user is None and instance.sale_id is not None:
            try:
                user = instance.sale.cashier
            except Exception:
                user = None

        log_activity(
            user=user,
            action='create',
            target_model='Invoice',
            target_id=instance.pk,
            description=(
                f"Facture {instance.invoice_number} générée — "
                f"{instance.total_amount} FCFA"
            ),
        )
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Product
# ---------------------------------------------------------------------------

@receiver(post_save, sender='products.Product')
def log_product_saved(sender, instance, created: bool, **kwargs) -> None:
    """Log product creation (using created_by) or update (user=None because
    there is no updated_by field on Product)."""
    try:
        from .utils import log_activity
        if created:
            log_activity(
                user=instance.created_by,
                action='create',
                target_model='Product',
                target_id=instance.pk,
                description=f"Nouveau produit ajouté : {instance.name}",
            )
        else:
            log_activity(
                user=instance.created_by,
                action='update',
                target_model='Product',
                target_id=instance.pk,
                description=f"Produit modifié : {instance.name}",
            )
    except Exception:
        pass


@receiver(post_delete, sender='products.Product')
def log_product_deleted(sender, instance, **kwargs) -> None:
    try:
        from .utils import log_activity
        log_activity(
            user=instance.created_by,
            action='delete',
            target_model='Product',
            target_id=instance.pk,
            description=f"Produit supprimé : {instance.name}",
        )
    except Exception:
        pass
