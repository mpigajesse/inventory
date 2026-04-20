from rest_framework.permissions import BasePermission, SAFE_METHODS


def _profile_is_active(user) -> bool:
    """Retourne True si l'utilisateur possède un profil actif.

    Vérifie à la fois user.is_active (authentification Django) et
    profile.is_active (désactivation applicative).
    """
    profile = getattr(user, 'profile', None)
    return profile is not None and profile.is_active


class IsAdminRole(BasePermission):
    """Admin complet — role='admin' ou is_staff=True, et profil actif."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        profile = getattr(request.user, 'profile', None)
        if profile is None or not profile.is_active:
            return False
        return profile.role == 'admin' or request.user.is_staff


class IsAdminOrReadOnly(BasePermission):
    """Admin pour les opérations d'écriture ; tout utilisateur authentifié avec profil actif pour la lecture."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if not _profile_is_active(request.user):
            return False
        if request.method in SAFE_METHODS:
            return True
        profile = getattr(request.user, 'profile', None)
        return profile is not None and (profile.role == 'admin' or request.user.is_staff)


class IsVendeurOrAdmin(BasePermission):
    """Tout utilisateur authentifié possédant un profil actif (vendeur ou admin)."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and _profile_is_active(request.user)
        )
