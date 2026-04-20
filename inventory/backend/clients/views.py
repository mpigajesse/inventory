from django.db import models
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsVendeurOrAdmin
from activity.utils import log_activity
from .models import Client
from .serializers import ClientSerializer
from notifications.utils import notify_new_client


class ClientPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.filter(is_active=True).annotate(
        _purchases_count=models.Count('sales', distinct=True),
        _total_purchases=models.Sum('sales__total_amount'),
    )
    serializer_class = ClientSerializer
    permission_classes = [IsVendeurOrAdmin]
    pagination_class = ClientPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'phone', 'email']
    filterset_fields = ['city', 'is_active']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def perform_create(self, serializer: ClientSerializer) -> None:
        instance = serializer.save()
        notify_new_client(instance)
        try:
            log_activity(
                user=self.request.user, action='create', target_model='Client',
                target_id=instance.pk,
                description=f"Client créé : {instance.name}",
                request=self.request,
            )
        except Exception:
            pass

    def perform_update(self, serializer: ClientSerializer) -> None:
        instance = serializer.save()
        try:
            log_activity(
                user=self.request.user, action='update', target_model='Client',
                target_id=instance.pk,
                description=f"Client modifié : {instance.name}",
                request=self.request,
            )
        except Exception:
            pass

    def perform_destroy(self, instance: Client) -> None:
        """Soft-delete: désactive le client sans le supprimer de la base."""
        name = getattr(instance, 'name', str(instance.pk))
        instance.is_active = False
        instance.save()
        try:
            log_activity(
                user=self.request.user, action='delete', target_model='Client',
                description=f"Client supprimé : {name}",
                request=self.request,
            )
        except Exception:
            pass

    @action(detail=True, methods=['get'], url_path='purchases')
    def purchases(self, request, pk=None):
        """Retourne les 50 dernières ventes du client."""
        client = self.get_object()
        from sales.serializers import SaleSerializer
        sales = client.sales.prefetch_related('items__product').order_by('-created_at')[:50]
        return Response(SaleSerializer(sales, many=True).data)
