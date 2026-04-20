from django.db import transaction
from rest_framework import viewsets, generics, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsAdminRole, IsAdminOrReadOnly
from .models import Stock, StockMovement
from .serializers import StockSerializer, StockAdjustmentSerializer, StockMovementSerializer
from activity.utils import log_activity


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

        # BUG-4 FIX: valider que les seuils sont positifs et cohérents entre eux
        errors = {}
        try:
            new_min = int(min_threshold) if min_threshold is not None else stock.min_threshold
            if new_min < 0:
                errors['min_threshold'] = 'Le seuil minimum ne peut pas être négatif.'
        except (ValueError, TypeError):
            errors['min_threshold'] = 'Valeur entière requise.'
            new_min = stock.min_threshold

        try:
            new_max = int(max_threshold) if max_threshold is not None else stock.max_threshold
            if new_max < 0:
                errors['max_threshold'] = 'Le seuil maximum ne peut pas être négatif.'
        except (ValueError, TypeError):
            errors['max_threshold'] = 'Valeur entière requise.'
            new_max = stock.max_threshold

        if not errors and new_min >= new_max:
            errors['min_threshold'] = 'Le seuil minimum doit être inférieur au seuil maximum.'

        if errors:
            return Response(errors, status=400)

        stock.min_threshold = new_min
        stock.max_threshold = new_max
        fields_to_save = [
            f for f in ('min_threshold', 'max_threshold')
            if request.data.get(f) is not None
        ]
        stock.save(update_fields=fields_to_save)
        return Response(StockSerializer(stock).data)

    @action(detail=True, methods=['post'], url_path='adjust')
    def adjust(self, request, pk=None):
        """Applique une entrée, sortie ou correction sur un stock."""
        # Validation initiale sans contexte stock (vérifs de base uniquement)
        serializer = StockAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            # BUG-1 FIX: select_for_update() verrouille la ligne jusqu'à la fin
            # de la transaction — empêche toute race condition sur les sorties
            # simultanées qui pourraient rendre le stock négatif.
            stock = Stock.objects.select_for_update().get(pk=pk)
            qty_before = stock.quantity

            if data['movement_type'] == 'entry':
                stock.quantity += data['quantity']
            elif data['movement_type'] == 'exit':
                # BUG-1 FIX: la vérification stock suffisant est ici, DANS la
                # transaction avec le verrou, pas dans le serializer.
                if data['quantity'] > stock.quantity:
                    from rest_framework.exceptions import ValidationError
                    raise ValidationError(
                        {'quantity': 'Stock insuffisant pour cette sortie.'}
                    )
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

        product_name = stock.product.name
        quantity = data['quantity']
        movement_type = data['movement_type']

        if movement_type == 'entry':
            try:
                log_activity(
                    user=request.user,
                    action='stock_in',
                    target_model='Stock',
                    target_id=stock.pk,
                    description=f"Entrée stock : {product_name} +{quantity} unités (stock total: {stock.quantity})",
                    request=request,
                )
            except Exception:
                pass
        elif movement_type == 'exit':
            try:
                log_activity(
                    user=request.user,
                    action='stock_out',
                    target_model='Stock',
                    target_id=stock.pk,
                    description=f"Sortie stock : {product_name} -{quantity} unités (stock total: {stock.quantity})",
                    request=request,
                )
            except Exception:
                pass
        else:  # adjustment
            try:
                log_activity(
                    user=request.user,
                    action='update',
                    target_model='Stock',
                    target_id=stock.pk,
                    description=f"Ajustement stock : {product_name} → {stock.quantity} unités",
                    request=request,
                )
            except Exception:
                pass

        return Response(StockSerializer(stock).data)


class StockMovementListView(generics.ListAPIView):
    serializer_class = StockMovementSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['product', 'movement_type']
    ordering = ['-created_at']

    def get_queryset(self):
        return StockMovement.objects.select_related('product', 'performed_by').all()
