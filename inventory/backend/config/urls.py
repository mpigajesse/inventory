"""
URL configuration for NAOSERVICES INVENTORY backend.
"""

from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView
from rest_framework_simplejwt.views import TokenRefreshView
from config.dashboard import DashboardStatsView
from users.views import CustomTokenObtainPairView

urlpatterns = [
    path('', RedirectView.as_view(url='/admin/', permanent=False)),
    path('admin/', admin.site.urls),
    # Auth — JWT
    path('api/auth/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
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
    path('api/statistics/', include('statistics_app.urls')),
]
