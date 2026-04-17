from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ActivityLogViewSet, ActivityRealtimeView, SmartAlertsView, VendeurSummaryView

router = DefaultRouter()
router.register(r'', ActivityLogViewSet, basename='activity')

urlpatterns = [
    path('vendeur-summary/', VendeurSummaryView.as_view(), name='activity-vendeur-summary'),
    path('realtime/', ActivityRealtimeView.as_view(), name='activity-realtime'),
    path('alerts/', SmartAlertsView.as_view(), name='activity-alerts'),
] + router.urls
