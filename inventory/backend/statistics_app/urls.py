from django.urls import path
from . import views

urlpatterns = [
    path('overview/', views.OverviewView.as_view()),
    path('sales/', views.SalesView.as_view()),
    path('products/', views.ProductsView.as_view()),
    path('clients/', views.ClientsView.as_view()),
    path('cashiers/', views.CashiersView.as_view()),
    path('payment-methods/', views.PaymentMethodsView.as_view()),
    path('stock/', views.StockView.as_view()),
]
