from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    is_online = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['role', 'genre', 'phone', 'avatar', 'avatar_url', 'is_active', 'permissions', 'last_seen', 'is_online']

    def get_avatar_url(self, obj):
        return obj.avatar.url if obj.avatar else None

    def get_is_online(self, obj) -> bool:
        return obj.is_online


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
    genre = serializers.ChoiceField(
        choices=[('M', 'Monsieur'), ('F', 'Madame')],
        required=False,
        write_only=True,
        allow_null=True,
        allow_blank=False,
    )
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'role', 'phone', 'genre']

    def create(self, validated_data):
        role = validated_data.pop('role', 'vendeur')
        phone = validated_data.pop('phone', '')
        genre = validated_data.pop('genre', None)
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data, password=password)
        user.profile.role = role
        user.profile.phone = phone
        user.profile.genre = genre
        user.profile.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(
        choices=UserProfile.ROLE_CHOICES,
        source='profile.role',
        required=False,
    )
    phone = serializers.CharField(
        source='profile.phone',
        required=False,
        allow_blank=True,
    )
    profile_is_active = serializers.BooleanField(
        source='profile.is_active',
        required=False,
    )
    VALID_PERMISSIONS = [
        'manage_users', 'manage_products', 'manage_stock', 'view_reports',
        'manage_settings', 'manage_suppliers', 'view_barcodes',
        'make_sales', 'view_invoices', 'manage_clients',
    ]
    permissions = serializers.ListField(
        child=serializers.ChoiceField(choices=VALID_PERMISSIONS),
        source='profile.permissions',
        required=False,
    )
    genre = serializers.ChoiceField(
        choices=[('M', 'Monsieur'), ('F', 'Madame'), ('', '')],
        source='profile.genre',
        required=False,
        allow_null=True,
        allow_blank=True,
    )

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'username', 'role', 'phone', 'genre', 'profile_is_active', 'permissions']

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if profile_data:
            profile = instance.profile
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=6)


class MeProfileSerializer(serializers.ModelSerializer):
    """Only phone and avatar are writable for self-update — role/is_active/permissions are read-only."""
    avatar_url = serializers.SerializerMethodField()
    is_online = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['role', 'genre', 'phone', 'avatar', 'avatar_url', 'is_active', 'permissions', 'last_seen', 'is_online']
        read_only_fields = ['role', 'is_active', 'permissions', 'last_seen', 'is_online']

    def get_avatar_url(self, obj):
        return obj.avatar.url if obj.avatar else None

    def get_is_online(self, obj) -> bool:
        return obj.is_online


class MeSerializer(serializers.ModelSerializer):
    profile = MeProfileSerializer()
    full_name = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'profile']
        read_only_fields = ['id', 'username']

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


class UserDetailSerializer(serializers.ModelSerializer):
    profile = MeProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    total_sales = serializers.SerializerMethodField()
    total_revenue = serializers.SerializerMethodField()
    last_login = serializers.DateTimeField(format='%Y-%m-%dT%H:%M:%SZ', read_only=True)
    date_joined = serializers.DateTimeField(format='%Y-%m-%dT%H:%M:%SZ', read_only=True)

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_total_sales(self, obj):
        return obj.sales.count()

    def get_total_revenue(self, obj):
        from django.db.models import Sum
        result = obj.sales.aggregate(total=Sum('total_amount'))
        return result['total'] or 0

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'is_active', 'last_login', 'date_joined', 'profile',
            'total_sales', 'total_revenue',
        ]


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # Vérification supplémentaire : le profil applicatif doit être actif.
        # Django vérifie déjà user.is_active, mais un admin peut désactiver
        # le profil (profile.is_active=False) indépendamment de user.is_active.
        try:
            profile = self.user.profile
            if not profile.is_active:
                from rest_framework_simplejwt.exceptions import AuthenticationFailed
                raise AuthenticationFailed(
                    'Ce compte a été désactivé. Contactez un administrateur.',
                    code='account_disabled',
                )
            data['role'] = profile.role
        except UserProfile.DoesNotExist:
            data['role'] = 'vendeur'
        data['user_id'] = self.user.pk
        data['username'] = self.user.username
        data['full_name'] = self.user.get_full_name() or self.user.username
        return data
