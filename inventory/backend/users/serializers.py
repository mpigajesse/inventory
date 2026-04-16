from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['role', 'phone', 'avatar', 'avatar_url', 'is_active']

    def get_avatar_url(self, obj):
        return obj.avatar.url if obj.avatar else None


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'is_active', 'date_joined', 'profile']
        read_only_fields = ['id', 'date_joined']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class UserCreateSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=['admin', 'vendeur'], write_only=True, default='vendeur')
    phone = serializers.CharField(required=False, write_only=True)
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'role', 'phone']

    def create(self, validated_data):
        role = validated_data.pop('role', 'vendeur')
        phone = validated_data.pop('phone', '')
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data, password=password)
        user.profile.role = role
        user.profile.phone = phone
        user.profile.save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=6)


class MeProfileSerializer(serializers.ModelSerializer):
    """Only phone and avatar are writable for self-update — role/is_active are read-only."""
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['role', 'phone', 'avatar', 'avatar_url', 'is_active']
        read_only_fields = ['role', 'is_active']

    def get_avatar_url(self, obj):
        return obj.avatar.url if obj.avatar else None


class MeSerializer(serializers.ModelSerializer):
    profile = MeProfileSerializer()
    full_name = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'profile']

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if profile_data:
            for attr, val in profile_data.items():
                setattr(instance.profile, attr, val)
            instance.profile.save()
        return instance


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user_id'] = self.user.pk
        data['username'] = self.user.username
        data['full_name'] = self.user.get_full_name() or self.user.username
        try:
            data['role'] = self.user.profile.role
        except UserProfile.DoesNotExist:
            data['role'] = 'vendeur'
        return data
