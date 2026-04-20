import datetime
from datetime import timedelta

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

from users.models import UserProfile
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
        # select_related('user__profile') avoids N+1 on get_user_role
        qs = ActivityLog.objects.select_related('user__profile').order_by('-created_at')
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

    def get_serializer_context(self):
        """Inject a pre-fetched Sale cache to avoid N+1 in the serializer.

        For the current page of ActivityLog rows that reference a Sale, we
        fetch all matching Sale objects in a single query and pass them as
        ``sale_cache`` in the serializer context.
        """
        context = super().get_serializer_context()
        # Only build the cache when we are about to serialise a list/page.
        queryset = self.get_queryset()
        # Collect distinct Sale IDs referenced by logs on this page.
        sale_ids = list(
            queryset
            .filter(target_model='Sale', target_id__isnull=False)
            .values_list('target_id', flat=True)
            .distinct()
        )
        if sale_ids:
            from sales.models import Sale
            sales = (
                Sale.objects
                .filter(pk__in=sale_ids)
                .prefetch_related('items')
            )
            context['sale_cache'] = {s.pk: s for s in sales}
        else:
            context['sale_cache'] = {}
        return context

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


class ActivityRealtimeView(APIView):
    """
    Polling endpoint for real-time activity feed and online-user presence.

    GET /api/activity/realtime/?since_id=<last_seen_id>

    Returns new ActivityLog entries since `since_id` (last 10 if omitted),
    the current highest log ID, and the list of users active in the last 5 min.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        since_id_param = request.query_params.get('since_id')

        if since_id_param is not None:
            try:
                since_id = int(since_id_param)
            except ValueError:
                since_id = None
        else:
            since_id = None

        if since_id is not None:
            new_logs_qs = (
                ActivityLog.objects
                .filter(id__gt=since_id)
                .select_related('user')
                .order_by('-created_at')[:20]
            )
        else:
            new_logs_qs = (
                ActivityLog.objects
                .select_related('user')
                .order_by('-created_at')[:10]
            )

        new_logs = list(new_logs_qs)
        serialized_logs = ActivityLogSerializer(new_logs, many=True).data

        # Derive latest_id from the already-fetched logs to avoid an extra query.
        # Fall back to a DB query only when no logs were returned at all.
        if new_logs:
            latest_id = new_logs[0].id  # queryset is ordered by -created_at
        else:
            latest = ActivityLog.objects.order_by('-id').values_list('id', flat=True).first()
            latest_id = latest if latest is not None else 0

        cutoff = timezone.now() - timedelta(minutes=5)
        online_profiles = (
            UserProfile.objects
            .filter(last_seen__gte=cutoff)
            .select_related('user')
        )

        online_users = [
            {
                'user_id': p.user.id,
                'username': p.user.username,
                'full_name': p.user.get_full_name() or p.user.username,
            }
            for p in online_profiles
        ]

        return Response({
            'new_logs': serialized_logs,
            'latest_id': latest_id,
            'online_count': len(online_users),
            'online_users': online_users,
        })


class SmartAlertsView(APIView):
    """
    Admin-only endpoint that detects behavioural patterns and returns actionable alerts.

    GET /api/activity/alerts/

    Alert types:
      - inactivity  : vendeur logged in today but last_seen > 30 min ago
      - big_sale    : sale with total_amount > 50 000 FCFA in the last hour
      - high_velocity: vendeur with > 20 sales in the last hour
    """
    permission_classes = [IsAuthenticated]

    def _require_admin(self, request: Request) -> None:
        profile = getattr(request.user, 'profile', None)
        if profile is None or profile.role != 'admin':
            raise PermissionDenied("Accès réservé aux administrateurs.")

    def get(self, request: Request) -> Response:
        self._require_admin(request)

        from sales.models import Sale

        now = timezone.now()
        today_start = timezone.make_aware(
            datetime.datetime.combine(now.date(), datetime.time.min)
        )
        one_hour_ago = now - timedelta(hours=1)
        thirty_min_ago = now - timedelta(minutes=30)

        alerts = []
        alert_id = 1

        # --- 1. Inactivity alert ---
        inactive_profiles = (
            UserProfile.objects
            .filter(
                role='vendeur',
                last_seen__gte=today_start,
                last_seen__lt=thirty_min_ago,
            )
            .select_related('user')
        )
        for profile in inactive_profiles:
            elapsed_minutes = int((now - profile.last_seen).total_seconds() // 60)
            full_name = profile.user.get_full_name() or profile.user.username
            alerts.append({
                'id': alert_id,
                'type': 'inactivity',
                'severity': 'warning',
                'title': 'Vendeur inactif',
                'message': f"{full_name} est inactif depuis {elapsed_minutes} min",
                'user_id': profile.user.id,
                'user_name': full_name,
                'created_at': now,
            })
            alert_id += 1

        # --- 2. Big sale alert ---
        big_sales = (
            Sale.objects
            .filter(created_at__gte=one_hour_ago, total_amount__gt=50000)
            .select_related('cashier')
            .order_by('-created_at')
        )
        for sale in big_sales:
            cashier = sale.cashier
            cashier_name = cashier.get_full_name() or cashier.username if cashier else 'Inconnu'
            cashier_id = cashier.id if cashier else None
            alerts.append({
                'id': alert_id,
                'type': 'big_sale',
                'severity': 'info',
                'title': 'Vente importante',
                'message': (
                    f"Vente de {sale.total_amount:,} FCFA enregistrée"
                    f" par {cashier_name}"
                ).replace(',', ' '),
                'user_id': cashier_id,
                'user_name': cashier_name,
                'created_at': sale.created_at,
            })
            alert_id += 1

        # --- 3. High-velocity alert ---
        from django.db.models import Count as _Count
        high_velocity_rows = (
            Sale.objects
            .filter(created_at__gte=one_hour_ago)
            .values('cashier__id', 'cashier__username', 'cashier__first_name', 'cashier__last_name')
            .annotate(sale_count=_Count('id'))
            .filter(sale_count__gt=20)
            .order_by('-sale_count')
        )
        for row in high_velocity_rows:
            first = row['cashier__first_name'] or ''
            last = row['cashier__last_name'] or ''
            full_name = f"{first} {last}".strip() or row['cashier__username']
            alerts.append({
                'id': alert_id,
                'type': 'high_velocity',
                'severity': 'warning',
                'title': 'Activité intense',
                'message': (
                    f"{full_name} a réalisé {row['sale_count']} ventes"
                    f" en moins d'une heure"
                ),
                'user_id': row['cashier__id'],
                'user_name': full_name,
                'created_at': now,
            })
            alert_id += 1

        return Response(alerts)
