from django.db import transaction
from rest_framework import viewsets, generics, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsAdminRole, IsAdminOrReadOnly
from .models import Stock, StockMovement
from .serializers import StockSerializer, StockAdjustmentSerializer, StockMovementSerializer


class StockViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Stock.objects.select_related('product__category').filter(product__is_active=True)
    serializer_class = StockSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['product__name', 'product__barcode']
    filterset_fields = ['product__category']
    ordering_fields = ['quantity', 'product__name']
    ordering = ['product__name']

    def get_permissions(self):
        """adjust et update_thresholds sont réservés aux admins."""
        if self.action in ('adjust', 'update_thresholds'):
            return [IsAdminRole()]
        return super().get_permissions()

    @action(detail=False, methods=['get'], url_path='alerts')
    def alerts(self, request):
        """Retourne uniquement les stocks en niveau Bas ou Critique."""
        from django.db.models import F
        stocks = self.get_queryset().filter(quantity__lte=F('min_threshold'))
        return Response(StockSerializer(stocks, many=True).data)

    @action(detail=True, methods=['patch'], url_path='thresholds')
    def update_thresholds(self, request, pk=None):
        """Met à jour les seuils min/max d'un stock."""
        stock = self.get_object()
        min_threshold = request.data.get('min_threshold')
        max_threshold = request.data.get('max_threshold')
        if min_threshold is None and max_threshold is None:
            return Response(
                {'detail': 'Au moins un seuil (min_threshold ou max_threshold) est requis.'},
                status=400,
            )
        if min_threshold is not None:
            stock.min_threshold = int(min_threshold)
        if max_threshold is not None:
            stock.max_threshold = int(max_threshold)
        stock.save(update_fields=[
            f for f in ('min_threshold', 'max_threshold')
            if request.data.get(f) is not None
        ])
        return Response(StockSerializer(stock).data)

    @action(detail=True, methods=['post'], url_path='adjust')
    def adjust(self, request, pk=None):
        """Applique une entrée, sortie ou correction sur un stock."""
        stock = self.get_object()
        serializer = StockAdjustmentSerializer(data=request.data, context={'stock': stock})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        qty_before = stock.quantity

        with transaction.atomic():
            if data['movement_type'] == 'entry':
                stock.quantity += data['quantity']
            elif data['movement_type'] == 'exit':
                stock.quantity -= data['quantity']
            else:  # adjustment
                stock.quantity = data['quantity']
            stock.save()

            StockMovement.objects.create(
                product=stock.product,
                movement_type=data['movement_type'],
                quantity=(
                    data['quantity']
                    if data['movement_type'] != 'adjustment'
                    else data['quantity'] - qty_before
                ),
                quantity_before=qty_before,
                quantity_after=stock.quantity,
                note=data.get('note', ''),
                performed_by=request.user,
            )

        return Response(StockSerializer(stock).data)


class StockMovementListView(generics.ListAPIView):
    serializer_class = StockMovementSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['product', 'movement_type']
    ordering = ['-created_at']

    def get_queryset(self):
        return StockMovement.objects.select_related('product', 'performed_by').all()
