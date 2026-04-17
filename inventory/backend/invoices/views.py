from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsVendeurOrAdmin
from .models import Invoice
from .serializers import InvoiceSerializer


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Invoice.objects.select_related(
        'client', 'issued_by', 'sale'
    ).prefetch_related('sale__items__product')
    serializer_class = InvoiceSerializer
    permission_classes = [IsVendeurOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'client']
    search_fields = ['invoice_number', 'client__name']
    ordering_fields = ['issued_at', 'total_amount']
    ordering = ['-issued_at']
