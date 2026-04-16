from django.db import models
from django.contrib.auth.models import User


class Sale(models.Model):
    PAYMENT_METHODS = [
        ('cash', 'Espèces'),
        ('mobile_money', 'Mobile Money'),
        ('card', 'Carte bancaire'),
        ('credit', 'Crédit client'),
    ]

    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sales',
    )
    cashier = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='sales',
    )
    total_amount = models.PositiveIntegerField(help_text='Total en FCFA')
    amount_paid = models.PositiveIntegerField(help_text='Montant reçu en FCFA')
    change_given = models.PositiveIntegerField(
        default=0,
        help_text='Monnaie rendue en FCFA',
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHODS,
        default='cash',
    )
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Vente'
        verbose_name_plural = 'Ventes'
        ordering = ['-created_at']

    def __str__(self):
        return f'Vente #{self.pk} — {self.total_amount} FCFA'


class SaleItem(models.Model):
    sale = models.ForeignKey(
        Sale,
        on_delete=models.CASCADE,
        related_name='items',
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.CASCADE,
    )
    quantity = models.PositiveIntegerField()
    unit_price = models.PositiveIntegerField(
        help_text='Prix au moment de la vente en FCFA',
    )
    subtotal = models.PositiveIntegerField(
        help_text='quantity × unit_price en FCFA',
    )

    class Meta:
        verbose_name = 'Article vendu'
        verbose_name_plural = 'Articles vendus'

    def save(self, *args, **kwargs):
        self.subtotal = self.quantity * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.product.name} x{self.quantity}'
