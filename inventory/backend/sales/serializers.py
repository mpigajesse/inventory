from rest_framework import serializers
from .models import Sale, SaleItem
from products.models import Product


class SaleItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.IntegerField(min_value=0)


class SaleCreateSerializer(serializers.Serializer):
    items = SaleItemInputSerializer(many=True, min_length=1)
    payment_method = serializers.ChoiceField(
        choices=['cash', 'mobile_money', 'card', 'credit'],
        default='cash',
    )
    amount_paid = serializers.IntegerField(min_value=0)
    client_id = serializers.IntegerField(required=False, allow_null=True)
    note = serializers.CharField(required=False, allow_blank=True)

    def validate_items(self, items):
        for item in items:
            try:
                product = Product.objects.select_related('stock').get(
                    pk=item['product_id'], is_active=True
                )
            except Product.DoesNotExist:
                raise serializers.ValidationError(
                    f"Produit ID {item['product_id']} introuvable."
                )
            if not hasattr(product, 'stock') or product.stock.quantity < item['quantity']:
                raise serializers.ValidationError(
                    f"Stock insuffisant pour '{product.name}'."
                )
        return items

    def validate(self, data):
        total = sum(i['quantity'] * i['unit_price'] for i in data['items'])
        if data['amount_paid'] < total:
            raise serializers.ValidationError(
                {'amount_paid': 'Montant reçu insuffisant.'}
            )
        data['total_amount'] = total
        data['change_given'] = data['amount_paid'] - total
        return data


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = SaleItem
        fields = ['id', 'product', 'product_name', 'quantity', 'unit_price', 'subtotal']


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    cashier_name = serializers.CharField(source='cashier.get_full_name', read_only=True)
    client_name = serializers.CharField(
        source='client.name', read_only=True, allow_null=True
    )
    invoice_number = serializers.CharField(
        source='invoice.invoice_number', read_only=True, allow_null=True
    )

    class Meta:
        model = Sale
        fields = [
            'id',
            'client',
            'client_name',
            'cashier',
            'cashier_name',
            'total_amount',
            'amount_paid',
            'change_given',
            'payment_method',
            'note',
            'invoice_number',
            'items',
            'created_at',
        ]
