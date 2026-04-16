from django.contrib import admin

from .models import Invoice


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = (
        'invoice_number',
        'issued_at',
        'client',
        'status',
        'total_amount',
        'amount_paid',
        'balance_due',
        'issued_by',
    )
    list_filter = ('status', 'issued_at')
    search_fields = ('invoice_number', 'client__name', 'issued_by__username', 'note')
    readonly_fields = ('invoice_number', 'issued_at', 'updated_at', 'balance_due')
    date_hierarchy = 'issued_at'

    @admin.display(description='Reste à payer (FCFA)')
    def balance_due(self, obj: Invoice) -> int:
        return obj.balance_due
