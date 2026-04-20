from django.db import models
from django.contrib.auth.models import User


class ActivityLog(models.Model):
    ACTION_CHOICES = [
        ('login', 'Connexion'),
        ('logout', 'Déconnexion'),
        ('create', 'Création'),
        ('update', 'Modification'),
        ('delete', 'Suppression'),
        ('sale', 'Vente'),
        ('stock_in', 'Entrée stock'),
        ('stock_out', 'Sortie stock'),
        ('print', 'Impression'),
        ('export', 'Export'),
    ]
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='activity_logs',
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    target_model = models.CharField(
        max_length=50,
        blank=True,
        help_text='Ex: Product, Client, Sale',
    )
    target_id = models.PositiveIntegerField(null=True, blank=True)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Journal d'activité"
        verbose_name_plural = "Journal d'activités"
        ordering = ['-created_at']
        indexes = [
            # Accélère le filtrage par date (views.py date_filter, VendeurSummaryView)
            models.Index(fields=['-created_at'], name='activity_log_created_at_idx'),
            # Accélère le filtrage par utilisateur + date (VendeurSummaryView)
            models.Index(fields=['user', '-created_at'], name='activity_log_user_created_idx'),
            # Accélère le filtrage par target_model + target_id (serializer sale_cache)
            models.Index(fields=['target_model', 'target_id'], name='activity_log_target_idx'),
        ]

    def __str__(self) -> str:
        return f'{self.get_action_display()} par {self.user} — {self.created_at:%d/%m/%Y %H:%M}'
