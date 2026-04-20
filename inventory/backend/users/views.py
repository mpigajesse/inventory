from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import UserProfile
from .permissions import IsAdminRole
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    UserDetailSerializer, ChangePasswordSerializer, MeSerializer,
    CustomTokenObtainPairSerializer,
)


class PasswordChangeThrottle(UserRateThrottle):
    scope = 'password_change'


class LoginRateThrottle(UserRateThrottle):
    scope = 'login'


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            username = request.data.get('username', '')
            try:
                from django.contrib.auth.models import User as DjangoUser
                user = DjangoUser.objects.get(username=username)
                # Track last_seen on successful login
                profile = getattr(user, 'profile', None)
                if profile:
                    profile.last_seen = timezone.now()
                    profile.save(update_fields=['last_seen'])
                from activity.utils import log_activity
                log_activity(
                    user=user,
                    action='login',
                    target_model='User',
                    target_id=user.pk,
                    description=f"Connexion de {user.get_full_name() or user.username}",
                    request=request,
                )
            except Exception:
                pass  # Never block login for a logging error
        return response


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = User.objects.select_related('profile').filter(is_superuser=False)
        is_active_param = self.request.query_params.get('is_active')
        if is_active_param is not None:
            qs = qs.filter(is_active=is_active_param.lower() == 'true')
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action in ('update', 'partial_update'):
            return UserUpdateSerializer
        if self.action == 'retrieve':
            return UserDetailSerializer
        return UserSerializer

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            return Response(
                {'detail': 'Vous ne pouvez pas désactiver votre propre compte.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = False
        user.save(update_fields=['is_active'])
        user.profile.is_active = False
        user.profile.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='activate')
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=['is_active'])
        user.profile.is_active = True
        user.profile.save(update_fields=['is_active'])
        return Response({'status': 'activated'})

    @action(detail=True, methods=['patch'], url_path='set-permissions')
    def set_permissions(self, request, pk=None):
        VALID_PERMISSIONS = [
            'manage_users', 'manage_products', 'manage_stock', 'view_reports',
            'manage_settings', 'manage_suppliers', 'view_barcodes',
            'make_sales', 'view_invoices', 'manage_clients',
        ]
        user = self.get_object()
        permissions = request.data.get('permissions', None)
        if permissions is None or not isinstance(permissions, list):
            return Response(
                {'detail': '`permissions` doit être une liste.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        invalid = [p for p in permissions if p not in VALID_PERMISSIONS]
        if invalid:
            return Response(
                {'detail': f'Permissions invalides : {invalid}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.profile.permissions = permissions
        user.profile.save(update_fields=['permissions'])
        return Response({'permissions': permissions}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='stats')
    def stats(self, request, pk=None):
        """Comprehensive stats for a specific vendeur (admin only)."""
        profile = getattr(request.user, 'profile', None)
        if profile is None or profile.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Admin only")

        user = self.get_object()
        from django.db.models import Sum, Count
        from django.utils import timezone
        import datetime
        from sales.models import Sale
        from activity.models import ActivityLog

        today = timezone.now().date()
        start_of_today = timezone.make_aware(datetime.datetime.combine(today, datetime.time.min))
        start_of_week = timezone.now() - datetime.timedelta(days=7)
        start_of_month = timezone.now() - datetime.timedelta(days=30)

        def sale_stats(since):
            agg = Sale.objects.filter(cashier=user, created_at__gte=since).aggregate(
                count=Count('id'), revenue=Sum('total_amount')
            )
            return {'count': agg['count'] or 0, 'revenue': agg['revenue'] or 0}

        last_activity = ActivityLog.objects.filter(user=user).order_by('-created_at').first()
        last_sale = Sale.objects.filter(cashier=user).order_by('-created_at').first()

        return Response({
            'user_id': user.pk,
            'username': user.username,
            'full_name': user.get_full_name(),
            'today': sale_stats(start_of_today),
            'week': sale_stats(start_of_week),
            'month': sale_stats(start_of_month),
            'last_activity': last_activity.created_at if last_activity else None,
            'last_action': last_activity.description if last_activity else None,
            'last_sale_at': last_sale.created_at if last_sale else None,
            'last_sale_amount': last_sale.total_amount if last_sale else None,
        })

    @action(detail=True, methods=['get'], url_path='activity')
    def recent_activity(self, request, pk=None):
        """Retourne les 20 dernières activités de cet utilisateur."""
        user = self.get_object()
        from activity.models import ActivityLog
        from activity.serializers import ActivityLogSerializer
        logs = ActivityLog.objects.filter(user=user).order_by('-created_at')[:20]
        return Response(ActivityLogSerializer(logs, many=True).data)


class OnlineUsersView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get(self, request):
        threshold = timezone.now() - timedelta(minutes=5)
        profiles = (
            UserProfile.objects.filter(last_seen__gte=threshold)
            .select_related('user')
        )
        data = [
            {
                'user_id': p.user.pk,
                'username': p.user.username,
                'full_name': p.user.get_full_name(),
                'last_seen': p.last_seen,
                'is_online': True,
                'role': p.role,
            }
            for p in profiles
        ]
        return Response(data)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = MeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return User.objects.select_related('profile').get(pk=self.request.user.pk)


class ChangePasswordView(generics.UpdateAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [PasswordChangeThrottle]

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'old_password': 'Mot de passe incorrect.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        # Blacklist the current refresh token so existing sessions are invalidated
        refresh_token = request.data.get('refresh')
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except TokenError:
                pass
        return Response({'detail': 'Mot de passe modifié avec succès.'})


class LogoutView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'detail': 'Le token de rafraîchissement est requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response(
                {'detail': 'Token invalide ou déjà révoqué.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({'detail': 'Déconnexion réussie.'})
