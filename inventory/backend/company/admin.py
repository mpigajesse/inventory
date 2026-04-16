from django.contrib import admin

from .models import CompanySettings


@admin.register(CompanySettings)
class CompanySettingsAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'country', 'currency', 'updated_at')
    readonly_fields = ('updated_at',)

    def has_add_permission(self, request) -> bool:
        # Only one CompanySettings record (pk=1) should ever exist.
        return not CompanySettings.objects.exists()

    def has_delete_permission(self, request, obj=None) -> bool:
        return False
