from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SaleViewSet, CreateSaleView

router = DefaultRouter()
router.register('', SaleViewSet, basename='sales')

urlpatterns = [
    path('create/', CreateSaleView.as_view()),
    path('', include(router.urls)),
]
