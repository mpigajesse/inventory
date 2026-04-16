from django.db import models
from django.contrib.auth.models import User
from products.models import Product


class Stock(models.Model):
    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        related_name='stock',
    )
    quantity = models.PositiveIntegerField(default=0)
    min_threshold = models.PositiveIntegerField(
        default=5,
        help_text="Seuil d'alerte bas",
    )
    max_threshold = models.PositiveIntegerField(default=100)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Stock'
        verbose_name_plural = 'Stocks'

    @property
    def status(self):
        if self.quantity <= self.min_threshold * 0.5:
            return 'critique'
        if self.quantity <= self.min_threshold:
            return 'bas'
        return 'normal'

    def __str__(self):
        return f'{self.product.name} — {self.quantity} unités'


class StockMovement(models.Model):
    MOVEMENT_TYPES = [
        ('entry', 'Entrée'),
        ('exit', 'Sortie'),
        ('adjustment', 'Ajustement'),
        ('sale', 'Vente'),
        ('return', 'Retour'),
    ]

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='movements',
    )
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES)
    quantity = models.IntegerField(help_text='Positif=entrée, négatif=sortie')
    quantity_before = models.PositiveIntegerField()
    quantity_after = models.PositiveIntegerField()
    note = models.TextField(blank=True)
    performed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Mouvement de stock'
        verbose_name_plural = 'Mouvements de stock'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.get_movement_type_display()} — {self.product.name} ({self.quantity:+d})'
