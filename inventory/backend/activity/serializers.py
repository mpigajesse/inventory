from rest_framework import serializers

from .models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
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

    def get_user_name(self, obj: ActivityLog) -> str | None:
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return None

    def get_sale_amount(self, obj: ActivityLog):
        if obj.target_model == 'Sale' and obj.target_id:
            try:
                from sales.models import Sale
                return Sale.objects.get(pk=obj.target_id).total_amount
            except Exception:
                return None
        return None

    def get_items_count(self, obj: ActivityLog):
        if obj.target_model == 'Sale' and obj.target_id:
            try:
                from sales.models import Sale
                return Sale.objects.get(pk=obj.target_id).items.count()
            except Exception:
                return None
        return None

    def get_user_role(self, obj: ActivityLog):
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
