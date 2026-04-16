from django.contrib import admin
from .models import Stock, StockMovement


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ('product', 'quantity', 'min_threshold', 'max_threshold', 'status', 'updated_at')
    search_fields = ('product__name', 'product__barcode')
    list_filter = ('updated_at',)
    ordering = ('product__name',)
    readonly_fields = ('updated_at', 'status')
    raw_id_fields = ('product',)


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = (
        'product',
        'movement_type',
        'quantity',
        'quantity_before',
        'quantity_after',
        'performed_by',
        'created_at',
    )
    search_fields = ('product__name', 'product__barcode', 'note')
    list_filter = ('movement_type', 'created_at')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)
    raw_id_fields = ('product', 'performed_by')
