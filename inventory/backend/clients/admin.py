from django.contrib import admin

from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'email', 'city', 'credit_balance', 'is_active', 'created_at')
    search_fields = ('name', 'phone', 'email', 'city')
    list_filter = ('is_active', 'city')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('name', 'phone', 'email', 'is_active'),
        }),
        ('Adresse', {
            'fields': ('address', 'city'),
        }),
        ('Informations financières', {
            'fields': ('credit_balance',),
        }),
        ('Notes', {
            'fields': ('note',),
        }),
        ('Horodatage', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
