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
        # Delegate to the model property — single source of truth, avoids duplicate query.
        return obj.total_purchases

    def get_purchases_count(self, obj: Client) -> int:
        return obj.sales.count()
