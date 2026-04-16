from django.contrib import admin

from .models import Sale, SaleItem


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    readonly_fields = ('subtotal',)
    fields = ('product', 'quantity', 'unit_price', 'subtotal')


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'created_at',
        'cashier',
        'client',
        'total_amount',
        'amount_paid',
        'change_given',
        'payment_method',
    )
    list_filter = ('payment_method', 'created_at')
    search_fields = ('id', 'cashier__username', 'client__name', 'note')
    readonly_fields = ('created_at',)
    inlines = [SaleItemInline]
    date_hierarchy = 'created_at'


@admin.register(SaleItem)
class SaleItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'sale', 'product', 'quantity', 'unit_price', 'subtotal')
    list_filter = ('product',)
    search_fields = ('sale__id', 'product__name')
    readonly_fields = ('subtotal',)
