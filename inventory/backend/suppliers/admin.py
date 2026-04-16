from django.contrib import admin

from .models import PurchaseOrder, PurchaseOrderItem, Supplier


class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 1
    readonly_fields = ('subtotal',)
    fields = ('product', 'quantity', 'unit_price', 'subtotal')

    def subtotal(self, obj: PurchaseOrderItem) -> str:
        return f'{obj.subtotal:,} FCFA' if obj.pk else '—'

    subtotal.short_description = 'Sous-total'


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'contact_name', 'phone', 'email', 'city', 'country', 'is_active', 'created_at')
    search_fields = ('name', 'contact_name', 'phone', 'email', 'city')
    list_filter = ('is_active', 'country', 'city')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('name', 'contact_name', 'is_active'),
        }),
        ('Contact', {
            'fields': ('phone', 'email'),
        }),
        ('Adresse', {
            'fields': ('address', 'city', 'country'),
        }),
        ('Notes', {
            'fields': ('note',),
        }),
        ('Horodatage', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'supplier', 'status', 'total_amount', 'ordered_by', 'ordered_at', 'received_at')
    search_fields = ('supplier__name', 'ordered_by__username')
    list_filter = ('status', 'ordered_at')
    readonly_fields = ('ordered_at', 'updated_at')
    inlines = [PurchaseOrderItemInline]
    fieldsets = (
        (None, {
            'fields': ('supplier', 'status', 'total_amount', 'ordered_by'),
        }),
        ('Dates', {
            'fields': ('ordered_at', 'received_at', 'updated_at'),
        }),
        ('Notes', {
            'fields': ('note',),
        }),
    )
