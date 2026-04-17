from django.db import models
from django.contrib.auth.models import User
from cloudinary.models import CloudinaryField


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Administrateur'),
        ('vendeur', 'Vendeur'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='vendeur')
    phone = models.CharField(max_length=20, blank=True)
    avatar = CloudinaryField('avatar', folder='inventory/avatars', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    permissions = models.JSONField(
        default=list,
        blank=True,
        help_text="Liste des permissions accordées à cet utilisateur",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Profil utilisateur'
        verbose_name_plural = 'Profils utilisateurs'

    def __str__(self) -> str:
        return f'{self.user.get_full_name() or self.user.username} ({self.get_role_display()})'
