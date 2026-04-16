"""
URL configuration for NAOSERVICES INVENTORY backend.
"""

from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from config.dashboard import DashboardStatsView

urlpatterns = [
    path('admin/', admin.site.urls),
    # Auth — JWT
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # App routers
    path('api/products/', include('products.urls')),
    path('api/stock/', include('stock.urls')),
    path('api/clients/', include('clients.urls')),
    path('api/suppliers/', include('suppliers.urls')),
    path('api/sales/', include('sales.urls')),
    path('api/invoices/', include('invoices.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/activity/', include('activity.urls')),
    path('api/users/', include('users.urls')),
    path('api/dashboard/', DashboardStatsView.as_view(), name='dashboard-stats'),
]
