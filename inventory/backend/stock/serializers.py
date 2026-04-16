from rest_framework import serializers
from .models import Stock, StockMovement


class StockSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_barcode = serializers.CharField(source='product.barcode', read_only=True)
    category_name = serializers.CharField(source='product.category.name', read_only=True)
    selling_price = serializers.IntegerField(source='product.selling_price', read_only=True)
    stock_value = serializers.SerializerMethodField()
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Stock
        fields = [
            'id', 'product', 'product_name', 'product_barcode', 'category_name',
            'quantity', 'min_threshold', 'max_threshold', 'selling_price',
            'stock_value', 'status', 'updated_at',
        ]
        read_only_fields = ['product', 'updated_at']

    def get_stock_value(self, obj):
        return obj.quantity * obj.product.selling_price


class StockAdjustmentSerializer(serializers.Serializer):
    movement_type = serializers.ChoiceField(choices=['entry', 'exit', 'adjustment'])
    quantity = serializers.IntegerField()
    note = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        qty = data['quantity']
        movement_type = data['movement_type']
        if movement_type in ('entry', 'exit') and qty <= 0:
            raise serializers.ValidationError(
                {'quantity': 'La quantité doit être supérieure à zéro.'}
            )
        stock = self.context.get('stock')
        if movement_type == 'exit' and stock:
            if qty > stock.quantity:
                raise serializers.ValidationError(
                    {'quantity': 'Stock insuffisant pour cette sortie.'}
                )
        return data


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    performed_by_name = serializers.CharField(
        source='performed_by.get_full_name', read_only=True
    )

    class Meta:
        model = StockMovement
        fields = [
            'id', 'product', 'product_name', 'movement_type', 'quantity',
            'quantity_before', 'quantity_after', 'note', 'performed_by_name', 'created_at',
        ]
