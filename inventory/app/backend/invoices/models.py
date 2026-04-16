from django.db import models
from django.contrib.auth.models import User


class Invoice(models.Model):
    STATUS_CHOICES = [
        ('paid', 'Payée'),
        ('partial', 'Partielle'),
        ('unpaid', 'Impayée'),
        ('cancelled', 'Annulée'),
    ]

    invoice_number = models.CharField(max_length=20, unique=True)
    sale = models.OneToOneField(
        'sales.Sale',
        on_delete=models.CASCADE,
        related_name='invoice',
        null=True,
        blank=True,
    )
    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices',
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='paid',
    )
    total_amount = models.PositiveIntegerField(help_text='Total en FCFA')
    amount_paid = models.PositiveIntegerField(default=0)
    note = models.TextField(blank=True)
    issued_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
    )
    issued_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Facture'
        verbose_name_plural = 'Factures'
        ordering = ['-issued_at']

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            last = Invoice.objects.order_by('-pk').first()
            next_num = (last.pk + 1) if last else 1
            self.invoice_number = f'FAC-{next_num:05d}'
        super().save(*args, **kwargs)

    @property
    def balance_due(self) -> int:
        return self.total_amount - self.amount_paid

    def __str__(self):
        return f'{self.invoice_number} — {self.total_amount} FCFA'
