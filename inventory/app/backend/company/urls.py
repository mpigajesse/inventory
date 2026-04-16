from django.urls import path

from .views import CompanySettingsView

urlpatterns = [
    path('', CompanySettingsView.as_view()),
]
