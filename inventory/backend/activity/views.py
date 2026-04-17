import datetime

from django.db.models import Count, Max
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
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
        qs = ActivityLog.objects.select_related('user').order_by('-created_at')
        date_filter = self.request.query_params.get('date')
        if date_filter:
            now = timezone.now()
            if date_filter == 'today':
                today = now.date()
                since = timezone.make_aware(datetime.datetime.combine(today, datetime.time.min))
                qs = qs.filter(created_at__gte=since)
            elif date_filter == 'yesterday':
                yesterday = now.date() - datetime.timedelta(days=1)
                since = timezone.make_aware(datetime.datetime.combine(yesterday, datetime.time.min))
                until = timezone.make_aware(datetime.datetime.combine(now.date(), datetime.time.min))
                qs = qs.filter(created_at__gte=since, created_at__lt=until)
            elif date_filter == 'week':
                qs = qs.filter(created_at__gte=now - datetime.timedelta(days=7))
            elif date_filter == 'month':
                qs = qs.filter(created_at__gte=now - datetime.timedelta(days=30))
        user_id = self.request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user__id=user_id)
        return qs

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


class VendeurSummaryView(APIView):
    """Admin-only: summary of all vendeur activity."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, 'profile', None)
        if profile is None or profile.role != 'admin':
            raise PermissionDenied("Accès réservé aux administrateurs.")

        since_param = request.query_params.get('since', 'today')
        now = timezone.now()
        if since_param == 'week':
            since = now - datetime.timedelta(days=7)
        elif since_param == 'month':
            since = now - datetime.timedelta(days=30)
        else:
            today = now.date()
            since = timezone.make_aware(datetime.datetime.combine(today, datetime.time.min))

        # Activity count per user since the date
        activity_stats = (
            ActivityLog.objects
            .filter(created_at__gte=since)
            .values('user__id', 'user__username', 'user__first_name', 'user__last_name')
            .annotate(
                action_count=Count('id'),
                last_action_at=Max('created_at'),
            )
            .order_by('-last_action_at')
        )

        # Sale count and revenue per cashier since the date
        from sales.models import Sale
        from django.db.models import Sum
        sale_stats = {
            s['cashier__id']: s
            for s in Sale.objects
            .filter(created_at__gte=since)
            .values('cashier__id')
            .annotate(sales_count=Count('id'), total_revenue=Sum('total_amount'))
        }

        # Last activity description per user
        last_desc = {}
        # distinct('field') only works on PostgreSQL; use fallback loop for SQLite
        try:
            for row in (
                ActivityLog.objects
                .filter(created_at__gte=since)
                .order_by('user_id', '-created_at')
                .distinct('user_id')
                .values('user_id', 'description')
            ):
                last_desc[row['user_id']] = row['description']
        except Exception:
            for log in (
                ActivityLog.objects
                .filter(created_at__gte=since)
                .order_by('-created_at')
                .select_related('user')[:200]
            ):
                if log.user_id not in last_desc:
                    last_desc[log.user_id] = log.description

        result = []
        for s in activity_stats:
            uid = s['user__id']
            sale_info = sale_stats.get(uid, {})
            result.append({
                'user_id': uid,
                'username': s['user__username'],
                'full_name': f"{s['user__first_name']} {s['user__last_name']}".strip() or s['user__username'],
                'action_count': s['action_count'],
                'last_action_at': s['last_action_at'],
                'last_action': last_desc.get(uid, ''),
                'sales_count': sale_info.get('sales_count', 0),
                'total_revenue': sale_info.get('total_revenue', 0),
            })

        return Response(result)
