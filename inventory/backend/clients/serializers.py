from rest_framework import serializers
from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    total_purchases = serializers.SerializerMethodField()
    purchases_count = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            'id', 'name', 'phone', 'email', 'address', 'city',
            'note', 'credit_balance', 'is_active',
            'total_purchases', 'purchases_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_total_purchases(self, obj: Client) -> int:
        # Use annotated value when available (list), fall back to model property (detail).
        annotated = getattr(obj, '_total_purchases', None)
        if annotated is not None:
            return annotated
        return obj.total_purchases

    def get_purchases_count(self, obj: Client) -> int:
        annotated = getattr(obj, '_purchases_count', None)
        if annotated is not None:
            return annotated
        return obj.sales.count()
