from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminRole(BasePermission):
    """Admin complet — role='admin' ou is_staff=True."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and hasattr(request.user, 'profile')
            and (request.user.profile.role == 'admin' or request.user.is_staff)
        )


class IsAdminOrReadOnly(BasePermission):
    """Admin pour les opérations d'écriture ; tout utilisateur authentifié pour la lecture."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user.is_authenticated
        return (
            request.user.is_authenticated
            and hasattr(request.user, 'profile')
            and (request.user.profile.role == 'admin' or request.user.is_staff)
        )


class IsVendeurOrAdmin(BasePermission):
    """Tout utilisateur authentifié possédant un profil (vendeur ou admin)."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and hasattr(request.user, 'profile')
        )
