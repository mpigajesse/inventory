from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StockViewSet, StockMovementListView

router = DefaultRouter()
router.register('', StockViewSet, basename='stock')

urlpatterns = [
    path('movements/', StockMovementListView.as_view()),
    path('', include(router.urls)),
]
