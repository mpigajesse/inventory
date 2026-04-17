from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ActivityLogViewSet, VendeurSummaryView

router = DefaultRouter()
router.register(r'', ActivityLogViewSet, basename='activity')

urlpatterns = [
    path('vendeur-summary/', VendeurSummaryView.as_view(), name='activity-vendeur-summary'),
] + router.urls
