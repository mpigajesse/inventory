from django.contrib import admin
from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'created_at', 'updated_at')
    search_fields = ('name',)
    ordering = ('name',)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'barcode',
        'category',
        'purchase_price',
        'selling_price',
        'is_active',
        'created_by',
        'created_at',
    )
    search_fields = ('name', 'barcode')
    list_filter = ('category', 'is_active', 'created_at')
    ordering = ('name',)
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('created_by',)
