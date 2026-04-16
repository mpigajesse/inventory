from rest_framework import serializers

from .models import CompanySettings


class CompanySettingsSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = CompanySettings
        fields = [
            'id',
            'name',
            'address',
            'city',
            'country',
            'phone',
            'email',
            'nif',
            'logo',
            'logo_url',
            'invoice_footer',
            'currency',
            'updated_at',
        ]

    def get_logo_url(self, obj: CompanySettings) -> str | None:
        if obj.logo:
            return obj.logo.url
        return None
