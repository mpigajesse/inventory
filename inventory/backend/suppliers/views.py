from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from users.permissions import IsAdminRole

from .models import PurchaseOrder, Supplier
from .serializers import PurchaseOrderSerializer, SupplierSerializer


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.filter(is_active=True)
    serializer_class = SupplierSerializer
    permission_classes = [IsAdminRole]
    # DjangoFilterBackend added so filterset_fields is honoured.
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['city', 'country', 'is_active']
    search_fields = ['name', 'contact_name', 'phone', 'email']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def perform_destroy(self, instance: Supplier) -> None:
        """Soft-delete: marque le fournisseur inactif au lieu de le supprimer."""
        instance.is_active = False
        instance.save()


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = (
        PurchaseOrder.objects
        .select_related('supplier', 'ordered_by')
        .prefetch_related('items__product')
    )
    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsAdminRole]
    # SearchFilter added so search_fields works; DjangoFilterBackend kept for filterset_fields.
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['supplier', 'status']
    search_fields = ['supplier__name']
    ordering_fields = ['ordered_at', 'total_amount']
    ordering = ['-ordered_at']
