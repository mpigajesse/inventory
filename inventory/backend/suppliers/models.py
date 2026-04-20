from django.contrib.auth.models import User
from django.core.validators import RegexValidator
from django.db import models

_phone_validator = RegexValidator(
    regex=r'^\+?[\d\s\-().]{6,20}$',
    message="Numéro de téléphone invalide. Exemples : +241 07 40 13 02, 074013 02.",
)


class Supplier(models.Model):
    name = models.CharField(max_length=200)
    contact_name = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=20, blank=True, validators=[_phone_validator])
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True, default='Gabon')
    note = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Fournisseur'
        verbose_name_plural = 'Fournisseurs'
        ordering = ['name']

    def __str__(self) -> str:
        return self.name


class PurchaseOrder(models.Model):
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('confirmed', 'Confirmée'),
        ('received', 'Reçue'),
        ('cancelled', 'Annulée'),
    ]

    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name='orders',
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
    )
    total_amount = models.PositiveIntegerField(default=0)
    note = models.TextField(blank=True)
    ordered_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    ordered_at = models.DateTimeField(auto_now_add=True)
    received_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Bon de commande'
        verbose_name_plural = 'Bons de commande'
        ordering = ['-ordered_at']

    def __str__(self) -> str:
        return f'BC-{self.pk:04d} — {self.supplier.name}'


class PurchaseOrderItem(models.Model):
    order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name='items',
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.PROTECT,
    )
    quantity = models.PositiveIntegerField()
    unit_price = models.PositiveIntegerField(help_text='Prix unitaire en FCFA')

    class Meta:
        verbose_name = 'Ligne de commande'
        verbose_name_plural = 'Lignes de commande'

    @property
    def subtotal(self) -> int:
        return self.quantity * self.unit_price

    def __str__(self) -> str:
        return f'{self.product.name} x{self.quantity}'
