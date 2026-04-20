from rest_framework import serializers

from .models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
    """Serializer for ActivityLog.

    Performance notes
    -----------------
    * ``get_sale_amount`` and ``get_items_count`` used to issue one SQL query
      per log entry (N+1).  They now read from a ``_sale_cache`` dict that the
      view layer is expected to inject via ``context['sale_cache']``.  When the
      cache is absent the fields return ``None`` rather than hitting the DB.
    * ``get_user_role`` requires the queryset to be fetched with
      ``select_related('user__profile')`` (done in the viewset's
      ``get_queryset``).
    """

    user_name = serializers.SerializerMethodField()
    sale_amount = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = [
            'id',
            'user',
            'user_name',
            'user_role',
            'action',
            'target_model',
            'target_id',
            'description',
            'ip_address',
            'created_at',
            'time_ago',
            'sale_amount',
            'items_count',
        ]

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _sale_cache(self) -> dict:
        """Return the pre-fetched Sale cache injected by the view, or {}."""
        return self.context.get('sale_cache', {})

    # ------------------------------------------------------------------
    # Field methods
    # ------------------------------------------------------------------

    def get_user_name(self, obj: ActivityLog) -> str | None:
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return None

    def get_sale_amount(self, obj: ActivityLog):
        """Read total_amount from the pre-fetched sale cache — zero SQL."""
        if obj.target_model == 'Sale' and obj.target_id:
            sale = self._sale_cache().get(obj.target_id)
            return sale.total_amount if sale is not None else None
        return None

    def get_items_count(self, obj: ActivityLog):
        """Read items count from the pre-fetched sale cache — zero SQL."""
        if obj.target_model == 'Sale' and obj.target_id:
            sale = self._sale_cache().get(obj.target_id)
            if sale is None:
                return None
            # items is a prefetch_related set; use len() to avoid an extra query
            try:
                return len(sale.items.all())
            except Exception:
                return None
        return None

    def get_user_role(self, obj: ActivityLog):
        # Requires select_related('user__profile') in the queryset.
        if obj.user:
            profile = getattr(obj.user, 'profile', None)
            return profile.role if profile else None
        return None

    def get_time_ago(self, obj: ActivityLog) -> str:
        from django.utils import timezone
        diff = timezone.now() - obj.created_at
        total_seconds = int(diff.total_seconds())
        if total_seconds < 60:
            return "à l'instant"
        minutes = total_seconds // 60
        if minutes < 60:
            return f"il y a {minutes} min"
        hours = minutes // 60
        if hours < 24:
            return f"il y a {hours} h"
        days = hours // 24
        if days < 7:
            return f"il y a {days} j"
        return obj.created_at.strftime('%d/%m/%Y')
