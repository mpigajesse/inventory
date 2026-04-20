from django.core.validators import RegexValidator
from django.db import models

_phone_validator = RegexValidator(
    regex=r'^\+?[\d\s\-().]{6,20}$',
    message="Numéro de téléphone invalide. Exemples : +241 07 40 13 02, 074013 02.",
)


class Client(models.Model):
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20, blank=True, validators=[_phone_validator])
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True, default='Libreville')
    note = models.TextField(blank=True)
    credit_balance = models.PositiveIntegerField(
        default=0,
        help_text='Solde crédit en FCFA',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Client'
        verbose_name_plural = 'Clients'
        ordering = ['name']

    def __str__(self) -> str:
        return self.name

    @property
    def total_purchases(self) -> int:
        """Montant total des achats du client en FCFA."""
        return self.sales.aggregate(total=models.Sum('total_amount'))['total'] or 0
