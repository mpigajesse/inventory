from django.db import models
from cloudinary.models import CloudinaryField


class CompanySettings(models.Model):
    name = models.CharField(max_length=200, default='NAOSERVICES')
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, default='Libreville')
    country = models.CharField(max_length=100, default='Gabon')
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    nif = models.CharField(
        max_length=50,
        blank=True,
        help_text="Numéro d'identifiant fiscal",
    )
    logo = CloudinaryField('logo', folder='inventory/company', blank=True, null=True)
    invoice_footer = models.TextField(blank=True)
    currency = models.CharField(max_length=10, default='FCFA')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Paramètres entreprise'
        verbose_name_plural = 'Paramètres entreprise'

    def __str__(self) -> str:
        return self.name

    @classmethod
    def get_settings(cls) -> 'CompanySettings':
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
