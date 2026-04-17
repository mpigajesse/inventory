from django.db import models


class PosSettings(models.Model):
    """Singleton model — one row per shop (id=1)."""

    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        verbose_name='Taux de taxe (%)',
    )
    currency = models.CharField(
        max_length=8,
        default='FCFA',
        verbose_name='Devise',
    )
    ticket_footer = models.TextField(
        blank=True,
        default='',
        verbose_name='Pied de ticket',
    )
    invoice_prefix = models.CharField(
        max_length=16,
        default='FAC',
        verbose_name='Préfixe facture',
    )
    default_payment_method = models.CharField(
        max_length=20,
        default='cash',
        verbose_name='Méthode de paiement par défaut',
    )

    class Meta:
        verbose_name = 'Paramètres POS'
        verbose_name_plural = 'Paramètres POS'

    def __str__(self) -> str:
        return f'Paramètres POS (id={self.pk})'
