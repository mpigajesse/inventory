import datetime

from django.db import transaction
from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework import viewsets, generics, filters, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsAdminOrReadOnly, IsVendeurOrAdmin

from .models import Sale, SaleItem
from .serializers import SaleCreateSerializer, SaleSerializer
from products.models import Product
from stock import models as stock_models
from stock.models import StockMovement
from invoices.models import Invoice
from notifications.utils import notify_sale, check_stock_alerts
from activity.utils import log_activity


class SaleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    List and retrieve sales.
    Supports filtering by payment_method, cashier, client.
    Ordered by most recent first.
    """
    queryset = Sale.objects.select_related('client', 'cashier').prefetch_related(
        'items__product'
    )
    serializer_class = SaleSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['payment_method', 'cashier', 'client']
    ordering = ['-created_at']


class CreateSaleView(generics.CreateAPIView):
    """
    Atomically: validate stock -> decrement stock -> create Sale ->
    create SaleItems -> create StockMovements -> create Invoice.
    """
    serializer_class = SaleCreateSerializer
    permission_classes = [IsVendeurOrAdmin]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            # 1. Lock stock rows for all products to prevent race conditions
            product_ids = [item['product_id'] for item in data['items']]
            locked_stocks = {
                s.product_id: s
                for s in stock_models.Stock.objects.select_for_update().filter(
                    product_id__in=product_ids
                )
            }

            # 2. Batch-fetch all products inside the lock
            products = {
                p.pk: p
                for p in Product.objects.filter(pk__in=product_ids)
            }

            # 3. Re-validate stock quantities and compute total from server prices
            for item_data in data['items']:
                stock = locked_stocks.get(item_data['product_id'])
                if stock is None or stock.quantity < item_data['quantity']:
                    raise ValidationError(
                        {'items': f"Stock insuffisant pour le produit #{item_data['product_id']}."}
                    )
                product = products.get(item_data['product_id'])
                if product is None:
                    raise ValidationError(
                        {'items': f"Produit #{item_data['product_id']} introuvable."}
                    )
                if product.selling_price < 1:
                    raise ValidationError(
                        {'items': f"Le prix de vente du produit '{product.name}' n'est pas défini."}
                    )

            # Compute authoritative total from server-side prices
            payment_method = data['payment_method']
            amount_paid = data['amount_paid']
            total_amount = sum(
                products[item['product_id']].selling_price * item['quantity']
                for item in data['items']
            )
            if payment_method != 'credit' and amount_paid < total_amount:
                raise ValidationError(
                    {'amount_paid': 'Montant reçu insuffisant.'}
                )
            change_given = max(0, amount_paid - total_amount) if payment_method != 'credit' else 0

            # 4. Create Sale with server-computed totals
            sale = Sale.objects.create(
                cashier=request.user,
                client_id=data.get('client_id'),
                total_amount=total_amount,
                amount_paid=amount_paid,
                change_given=change_given,
                payment_method=payment_method,
                note=data.get('note', ''),
            )

            # 5. Create SaleItems + decrement stock + record movements
            for item_data in data['items']:
                product = products[item_data['product_id']]
                # Use the server-side selling_price — client-supplied unit_price is ignored.
                server_price = product.selling_price
                SaleItem.objects.create(
                    sale=sale,
                    product=product,
                    quantity=item_data['quantity'],
                    unit_price=server_price,
                )
                stock = locked_stocks[item_data['product_id']]
                qty_before = stock.quantity
                stock.quantity -= item_data['quantity']
                stock.save()
                StockMovement.objects.create(
                    product=product,
                    movement_type='sale',
                    quantity=-item_data['quantity'],
                    quantity_before=qty_before,
                    quantity_after=stock.quantity,
                    note=f'Vente #{sale.pk}',
                    performed_by=request.user,
                )

            # 6. Create Invoice (invoice_number auto-generated by model.save)
            if sale.payment_method == 'credit':
                invoice_status = 'partial' if sale.amount_paid > 0 else 'unpaid'
            else:
                invoice_status = 'paid'
            Invoice.objects.create(
                sale=sale,
                client=sale.client,
                total_amount=sale.total_amount,
                amount_paid=sale.amount_paid,
                status=invoice_status,
                issued_by=request.user,
            )

        # 5. Send notifications outside the atomic block so they never
        #    roll back the sale if they fail.
        notify_sale(sale)
        for item_data in data['items']:
            stock = locked_stocks[item_data['product_id']]
            check_stock_alerts(stock)

        items_summary = ', '.join(
            f"{item.product.name} x{item.quantity}"
            for item in sale.items.select_related('product').all()
        )
        log_activity(
            user=request.user,
            action='sale',
            target_model='Sale',
            target_id=sale.pk,
            description=f"Vente #{sale.pk} — {sale.total_amount:,} FCFA | {sale.items.count()} article(s) : {items_summary[:200]}",
            request=request,
        )

        return Response(
            SaleSerializer(sale).data,
            status=status.HTTP_201_CREATED,
        )


class SalesDailyStatsView(APIView):
    """Returns sales stats per cashier for admin monitoring."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, 'profile', None)
        if profile is None or profile.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Admin only")

        today = timezone.now().date()
        since = request.query_params.get('since', 'today')
        if since == 'week':
            start_dt = timezone.now() - datetime.timedelta(days=7)
        elif since == 'month':
            start_dt = timezone.now() - datetime.timedelta(days=30)
        else:
            start_dt = timezone.make_aware(datetime.datetime.combine(today, datetime.time.min))

        stats = (
            Sale.objects
            .filter(created_at__gte=start_dt)
            .values('cashier__id', 'cashier__first_name', 'cashier__last_name', 'cashier__username')
            .annotate(
                sales_count=Count('id'),
                total_revenue=Sum('total_amount'),
            )
            .order_by('-total_revenue')
        )
        return Response([
            {
                'cashier_id': s['cashier__id'],
                'cashier_name': f"{s['cashier__first_name']} {s['cashier__last_name']}".strip() or s['cashier__username'],
                'sales_count': s['sales_count'],
                'total_revenue': s['total_revenue'] or 0,
            }
            for s in stats
        ])
