from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PosSettings
from .serializers import PosSettingsSerializer


class PosSettingsView(APIView):
    """GET / PATCH the singleton POS settings row (id=1).

    GET  — any authenticated user (vendeurs need tax_rate / currency).
    PATCH — admin only.
    """

    permission_classes = [IsAuthenticated]

    def _get_singleton(self) -> PosSettings:
        obj, _ = PosSettings.objects.get_or_create(id=1)
        return obj

    def _require_admin(self, request: Request) -> None:
        profile = getattr(request.user, 'profile', None)
        if profile is None or profile.role != 'admin':
            raise PermissionDenied("Modification réservée aux administrateurs.")

    def get(self, request: Request) -> Response:
        serializer = PosSettingsSerializer(self._get_singleton())
        return Response(serializer.data)

    def patch(self, request: Request) -> Response:
        self._require_admin(request)
        instance = self._get_singleton()
        serializer = PosSettingsSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
