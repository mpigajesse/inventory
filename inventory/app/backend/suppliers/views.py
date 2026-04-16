from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

from .models import PurchaseOrder, Supplier
from .serializers import PurchaseOrderSerializer, SupplierSerializer


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.filter(is_active=True)
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'contact_name', 'phone', 'email']
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
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['supplier', 'status']
    ordering = ['-ordered_at']
