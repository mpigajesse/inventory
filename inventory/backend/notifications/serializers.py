from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'recipient',
            'notification_type',
            'title',
            'message',
            'is_read',
            'related_product',
            'product_name',
            'created_at',
        ]

    def get_product_name(self, obj: Notification) -> str | None:
        if obj.related_product:
            return obj.related_product.name
        return None
