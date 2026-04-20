from django.db import models
from django.contrib.auth.models import User


class Notification(models.Model):
    TYPE_CHOICES = [
        ('stock_low', 'Stock bas'),
        ('stock_critical', 'Stock critique'),
        ('new_sale', 'Nouvelle vente'),
        ('new_client', 'Nouveau client'),
        ('system', 'Système'),
    ]
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    related_product = models.ForeignKey(
        'products.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read'], name='notif_recipient_is_read_idx'),
            models.Index(fields=['recipient', 'created_at'], name='notif_recipient_created_idx'),
        ]

    def __str__(self) -> str:
        return f'{self.title} — {self.recipient.username}'
