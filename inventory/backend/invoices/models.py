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
            # We must be inside an existing transaction.atomic() (from CreateSaleView).
            # Lock the latest row to serialise concurrent invoice number generation.
            # Using select_for_update() on the last row ensures only one writer
            # advances the counter at a time within a given transaction.
            # A unique constraint on invoice_number provides the final safety net.
            last = Invoice.objects.select_for_update().order_by('-pk').first()
            if last:
                try:
                    suffix = int(last.invoice_number.split('-')[-1]) + 1
                except (ValueError, IndexError):
                    suffix = last.pk + 1
            else:
                suffix = 1
            self.invoice_number = f'FAC-{suffix:05d}'
        super().save(*args, **kwargs)

    @property
    def balance_due(self) -> int:
        return self.total_amount - self.amount_paid

    def __str__(self):
        return f'{self.invoice_number} — {self.total_amount} FCFA'
