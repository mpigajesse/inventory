from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.viewsets import ReadOnlyModelViewSet

from django_filters.rest_framework import DjangoFilterBackend

from .models import ActivityLog
from .serializers import ActivityLogSerializer


class ActivityLogViewSet(ReadOnlyModelViewSet):
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['action', 'user', 'target_model']
    search_fields = ['description', 'user__username']
    ordering = ['-created_at']

    def get_queryset(self):
        return ActivityLog.objects.select_related('user').order_by('-created_at')

    def _require_admin(self, request: Request) -> None:
        profile = getattr(request.user, 'profile', None)
        if profile is None or profile.role != 'admin':
            raise PermissionDenied("Accès réservé aux administrateurs.")

    def list(self, request: Request, *args, **kwargs):
        self._require_admin(request)
        return super().list(request, *args, **kwargs)

    def retrieve(self, request: Request, *args, **kwargs):
        self._require_admin(request)
        return super().retrieve(request, *args, **kwargs)
