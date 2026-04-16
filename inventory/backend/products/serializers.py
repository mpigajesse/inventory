from rest_framework import serializers
from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'product_count', 'created_at']

    def get_product_count(self, obj):
        return obj.products.filter(is_active=True).count()


class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    image_url = serializers.SerializerMethodField()
    stock_quantity = serializers.SerializerMethodField()
    stock_status = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'barcode', 'category', 'category_name',
            'selling_price', 'purchase_price', 'image_url',
            'stock_quantity', 'stock_status', 'is_active', 'created_at',
        ]

    def get_image_url(self, obj):
        return obj.image.url if obj.image else None

    def get_stock_quantity(self, obj):
        return obj.stock.quantity if hasattr(obj, 'stock') else 0

    def get_stock_status(self, obj):
        return obj.stock.status if hasattr(obj, 'stock') else 'normal'


class ProductDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'barcode', 'category', 'category_name',
            'description', 'selling_price', 'purchase_price',
            'image', 'image_url', 'is_active',
            'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_image_url(self, obj):
        return obj.image.url if obj.image else None

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        product = super().create(validated_data)
        # Auto-create stock entry
        from stock.models import Stock
        Stock.objects.get_or_create(product=product)
        return product
