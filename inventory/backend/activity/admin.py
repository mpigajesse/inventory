from django.contrib import admin

from .models import ActivityLog


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'user', 'target_model', 'target_id', 'ip_address', 'created_at')
    list_filter = ('action', 'created_at')
    search_fields = ('description', 'user__username', 'target_model')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
