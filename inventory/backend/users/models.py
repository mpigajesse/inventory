from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Administrateur'),
        ('vendeur', 'Vendeur'),
    ]
    GENRE_CHOICES = [
        ('M', 'Monsieur'),
        ('F', 'Madame'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='vendeur')
    genre = models.CharField(max_length=1, choices=GENRE_CHOICES, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    permissions = models.JSONField(
        default=list,
        blank=True,
        help_text="Liste des permissions accordées à cet utilisateur",
    )
    last_seen = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_online(self) -> bool:
        if not self.last_seen:
            return False
        from django.utils import timezone
        return (timezone.now() - self.last_seen).total_seconds() < 300  # 5 min

    class Meta:
        verbose_name = 'Profil utilisateur'
        verbose_name_plural = 'Profils utilisateurs'

    def __str__(self) -> str:
        return f'{self.user.get_full_name() or self.user.username} ({self.get_role_display()})'
