from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request

from .models import CompanySettings
from .serializers import CompanySettingsSerializer


class CompanySettingsView(RetrieveUpdateAPIView):
    serializer_class = CompanySettingsSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self) -> CompanySettings:
        return CompanySettings.get_settings()

    def _require_admin(self, request: Request) -> None:
        profile = getattr(request.user, 'profile', None)
        if profile is None or profile.role != 'admin':
            raise PermissionDenied("Seuls les administrateurs peuvent modifier les paramètres.")

    def update(self, request: Request, *args, **kwargs):
        self._require_admin(request)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request: Request, *args, **kwargs):
        self._require_admin(request)
        return super().partial_update(request, *args, **kwargs)
