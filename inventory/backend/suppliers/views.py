from django.db import models
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.pagination import PageNumberPagination
from users.permissions import IsAdminRole
from activity.utils import log_activity

from .models import PurchaseOrder, Supplier
from .serializers import PurchaseOrderSerializer, SupplierSerializer


class SupplierPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class PurchaseOrderPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.filter(is_active=True).annotate(
        _orders_count=models.Count('orders', distinct=True),
    )
    serializer_class = SupplierSerializer
    permission_classes = [IsAdminRole]
    pagination_class = SupplierPagination
    # DjangoFilterBackend added so filterset_fields is honoured.
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['city', 'country', 'is_active']
    search_fields = ['name', 'contact_name', 'phone', 'email']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def perform_create(self, serializer: SupplierSerializer) -> None:
        instance = serializer.save()
        try:
            log_activity(
                user=self.request.user, action='create', target_model='Supplier',
                target_id=instance.pk,
                description=f"Fournisseur créé : {instance.name}",
                request=self.request,
            )
        except Exception:
            pass

    def perform_update(self, serializer: SupplierSerializer) -> None:
        instance = serializer.save()
        try:
            log_activity(
                user=self.request.user, action='update', target_model='Supplier',
                target_id=instance.pk,
                description=f"Fournisseur modifié : {instance.name}",
                request=self.request,
            )
        except Exception:
            pass

    def perform_destroy(self, instance: Supplier) -> None:
        """Soft-delete: marque le fournisseur inactif au lieu de le supprimer."""
        name = getattr(instance, 'name', str(instance.pk))
        instance.is_active = False
        instance.save()
        try:
            log_activity(
                user=self.request.user, action='delete', target_model='Supplier',
                description=f"Fournisseur supprimé : {name}",
                request=self.request,
            )
        except Exception:
            pass


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = (
        PurchaseOrder.objects
        .select_related('supplier', 'ordered_by')
        .prefetch_related('items__product')
    )
    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsAdminRole]
    pagination_class = PurchaseOrderPagination
    # SearchFilter added so search_fields works; DjangoFilterBackend kept for filterset_fields.
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['supplier', 'status']
    search_fields = ['supplier__name']
    ordering_fields = ['ordered_at', 'total_amount']
    ordering = ['-ordered_at']
