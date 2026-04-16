from rest_framework import serializers

from .models import PurchaseOrder, PurchaseOrderItem, Supplier


class SupplierSerializer(serializers.ModelSerializer):
    orders_count = serializers.SerializerMethodField()

    class Meta:
        model = Supplier
        fields = [
            'id',
            'name',
            'contact_name',
            'phone',
            'email',
            'address',
            'city',
            'country',
            'note',
            'is_active',
            'orders_count',
            'created_at',
        ]
        read_only_fields = ['created_at']

    def get_orders_count(self, obj: Supplier) -> int:
        return obj.orders.count()


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    subtotal = serializers.IntegerField(read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = ['id', 'product', 'product_name', 'quantity', 'unit_price', 'subtotal']


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    ordered_by_name = serializers.CharField(source='ordered_by.get_full_name', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            'id',
            'supplier',
            'supplier_name',
            'status',
            'total_amount',
            'note',
            'items',
            'ordered_by_name',
            'ordered_at',
            'received_at',
        ]
        read_only_fields = ['ordered_by_name', 'ordered_at', 'total_amount']

    def create(self, validated_data: dict) -> PurchaseOrder:
        items_data = validated_data.pop('items')
        order = PurchaseOrder.objects.create(
            ordered_by=self.context['request'].user,
            **validated_data,
        )
        total = 0
        for item_data in items_data:
            item = PurchaseOrderItem.objects.create(order=order, **item_data)
            total += item.subtotal
        order.total_amount = total
        order.save()
        return order
