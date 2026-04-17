from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, MeView, ChangePasswordView, LogoutView, OnlineUsersView

router = DefaultRouter()
router.register('', UserViewSet, basename='users')

urlpatterns = [
    path('me/', MeView.as_view()),
    path('me/change-password/', ChangePasswordView.as_view()),
    path('logout/', LogoutView.as_view()),
    path('online/', OnlineUsersView.as_view(), name='users-online'),
    path('', include(router.urls)),
]
