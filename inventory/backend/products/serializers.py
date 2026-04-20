import random

from rest_framework import serializers
from .models import Category, Product


def _generate_unique_ean13() -> str:
    """Generate a unique EAN-13 barcode not already in the database."""
    from .models import Product as _Product
    for _ in range(20):
        digits = [random.randint(0, 9) for _ in range(12)]
        total = sum(d * (1 if i % 2 == 0 else 3) for i, d in enumerate(digits))
        check = (10 - (total % 10)) % 10
        code = ''.join(map(str, digits)) + str(check)
        if not _Product.objects.filter(barcode=code).exists():
            return code
    raise ValueError("Impossible de générer un code-barres unique après 20 essais.")


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        # BUG-8 FIX: is_active et updated_at exposés pour que l'UI puisse
        # afficher/filtrer les catégories désactivées.
        fields = ['id', 'name', 'description', 'is_active', 'product_count', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

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
        from django.db import IntegrityError
        validated_data['created_by'] = self.context['request'].user
        if not validated_data.get('barcode'):
            validated_data['barcode'] = _generate_unique_ean13()
        # BUG-9 FIX: en cas de collision EAN-13 sous charge (race condition entre
        # deux créations simultanées), on régénère et réessaie une seule fois.
        try:
            product = super().create(validated_data)
        except IntegrityError:
            validated_data['barcode'] = _generate_unique_ean13()
            product = super().create(validated_data)
        # Auto-create stock entry
        from stock.models import Stock
        Stock.objects.get_or_create(product=product)
        return product

    def update(self, instance, validated_data):
        if 'barcode' in validated_data and not validated_data['barcode']:
            validated_data['barcode'] = _generate_unique_ean13()
        return super().update(instance, validated_data)
