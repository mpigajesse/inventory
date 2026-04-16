from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PurchaseOrderViewSet, SupplierViewSet

router = DefaultRouter()
router.register('orders', PurchaseOrderViewSet, basename='purchase-orders')
router.register('', SupplierViewSet, basename='suppliers')

urlpatterns = [path('', include(router.urls))]
