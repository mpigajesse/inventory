from rest_framework import serializers

from .models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = [
            'id',
            'user',
            'user_name',
            'action',
            'target_model',
            'target_id',
            'description',
            'ip_address',
            'created_at',
        ]

    def get_user_name(self, obj: ActivityLog) -> str | None:
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return None
