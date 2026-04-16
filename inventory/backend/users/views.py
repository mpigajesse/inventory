from django.contrib.auth.models import User
from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import UserProfile
from .serializers import (
    UserSerializer, UserCreateSerializer, ChangePasswordSerializer,
    MeSerializer, CustomTokenObtainPairSerializer,
)


class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return hasattr(request.user, 'profile') and request.user.profile.role == 'admin'


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('profile').filter(is_superuser=False)
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            return Response(
                {'detail': 'Vous ne pouvez pas supprimer votre propre compte.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = False
        user.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = MeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return User.objects.select_related('profile').get(pk=self.request.user.pk)


class ChangePasswordView(generics.UpdateAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [permissions.IsAuthenticated]

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
