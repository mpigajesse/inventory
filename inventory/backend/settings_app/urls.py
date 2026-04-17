from django.urls import path

from .views import PosSettingsView

urlpatterns = [
    path('pos/', PosSettingsView.as_view(), name='pos-settings'),
]
