from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, MeView, ChangePasswordView, LogoutView

router = DefaultRouter()
router.register('', UserViewSet, basename='users')

urlpatterns = [
    path('me/', MeView.as_view()),
    path('me/change-password/', ChangePasswordView.as_view()),
    path('logout/', LogoutView.as_view()),
    path('', include(router.urls)),
]
