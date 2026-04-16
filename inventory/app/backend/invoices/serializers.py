from rest_framework import serializers
from .models import Invoice
from sales.serializers import SaleItemSerializer


class InvoiceSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True, allow_null=True)
    issued_by_name = serializers.CharField(source='issued_by.get_full_name', read_only=True)
    balance_due = serializers.IntegerField(read_only=True)
    items = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id',
            'invoice_number',
            'sale',
            'client',
            'client_name',
            'status',
            'total_amount',
            'amount_paid',
            'balance_due',
            'note',
            'issued_by_name',
            'issued_at',
            'updated_at',
            'items',
        ]
        read_only_fields = ['invoice_number', 'issued_by_name', 'issued_at', 'balance_due']

    def get_items(self, obj):
        if obj.sale:
            return SaleItemSerializer(obj.sale.items.all(), many=True).data
        return []
