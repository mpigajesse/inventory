from rest_framework import serializers

from .models import PosSettings


class PosSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PosSettings
        fields = '__all__'
