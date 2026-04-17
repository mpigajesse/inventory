from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SaleViewSet, CreateSaleView, SalesDailyStatsView

router = DefaultRouter()
router.register('', SaleViewSet, basename='sales')

urlpatterns = [
    path('create/', CreateSaleView.as_view()),
    path('daily-stats/', SalesDailyStatsView.as_view(), name='sales-daily-stats'),
    path('', include(router.urls)),
]
