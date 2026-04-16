from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Client
from .serializers import ClientSerializer


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.filter(is_active=True)
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'phone', 'email']
    filterset_fields = ['city', 'is_active']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def perform_destroy(self, instance: Client) -> None:
        """Soft-delete: désactive le client sans le supprimer de la base."""
        instance.is_active = False
        instance.save()

    @action(detail=True, methods=['get'], url_path='purchases')
    def purchases(self, request, pk=None):
        """Retourne les 50 dernières ventes du client."""
        client = self.get_object()
        from sales.serializers import SaleSerializer
        sales = client.sales.prefetch_related('items__product').order_by('-created_at')[:50]
        return Response(SaleSerializer(sales, many=True).data)
