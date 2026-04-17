from datetime import timedelta

from django.contrib.auth.models import User
from django.db.models import Avg, Count, ExpressionWrapper, DecimalField, F, OuterRef, Q, Subquery, Sum
from django.db.models.functions import TruncDate, TruncHour, TruncMonth, TruncWeek
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from clients.models import Client
from products.models import Category, Product
from sales.models import Sale, SaleItem
from stock.models import Stock

PERIOD_DAYS = {
    'week': 7,
    'month': 30,
    'year': 365,
}


def _period_start(period: str):
    days = PERIOD_DAYS.get(period, 30)
    return timezone.now() - timedelta(days=days)


# ─── Overview helpers ─────────────────────────────────────────────────────────

def _change_pct(current, previous):
    """Return rounded % change, or None when previous is 0."""
    if previous == 0:
        return None
    return round((current - previous) / previous * 100, 1)


def _period_bounds(period: str):
    """Return (curr_start, curr_end, prev_start, prev_end) as aware datetimes."""
    now = timezone.now()
    today = now.date()
    _midnight = timezone.datetime.min.time()

    if period == 'today':
        curr_start = timezone.make_aware(timezone.datetime.combine(today, _midnight))
        curr_end = now
        prev_start = curr_start - timedelta(days=1)
        prev_end = curr_end - timedelta(days=1)

    elif period == 'month':
        curr_start = timezone.make_aware(
            timezone.datetime.combine(today.replace(day=1), _midnight)
        )
        curr_end = now
        # Previous month: same relative window inside the month before
        prev_end = curr_start - timedelta(seconds=1)
        prev_start = prev_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    elif period == 'year':
        curr_start = timezone.make_aware(
            timezone.datetime.combine(today.replace(month=1, day=1), _midnight)
        )
        curr_end = now
        prev_start = curr_start.replace(year=curr_start.year - 1)
        prev_end = curr_end.replace(year=curr_end.year - 1)

    else:  # 'week' (default)
        week_start = today - timedelta(days=today.weekday())
        curr_start = timezone.make_aware(timezone.datetime.combine(week_start, _midnight))
        curr_end = now
        prev_start = curr_start - timedelta(weeks=1)
        prev_end = curr_end - timedelta(weeks=1)

    return curr_start, curr_end, prev_start, prev_end


class OverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period = request.query_params.get('period', 'week')
        if period not in ('today', 'week', 'month', 'year'):
            period = 'week'

        curr_start, curr_end, prev_start, prev_end = _period_bounds(period)

        curr_qs = Sale.objects.filter(created_at__range=(curr_start, curr_end))
        prev_qs = Sale.objects.filter(created_at__range=(prev_start, prev_end))

        # Revenue
        curr_revenue = curr_qs.aggregate(total=Sum('total_amount'))['total'] or 0
        prev_revenue = prev_qs.aggregate(total=Sum('total_amount'))['total'] or 0

        # Transactions
        curr_tx = curr_qs.count()
        prev_tx = prev_qs.count()

        # Average basket
        curr_avg = round(curr_revenue / curr_tx) if curr_tx else 0
        prev_avg = round(prev_revenue / prev_tx) if prev_tx else 0

        # New clients
        curr_clients = Client.objects.filter(created_at__range=(curr_start, curr_end)).count()
        prev_clients = Client.objects.filter(created_at__range=(prev_start, prev_end)).count()

        # Stock alerts — mirrors Stock.status property thresholds
        critical_stock = Stock.objects.filter(
            quantity__lte=F('min_threshold') * 0.5,
            product__is_active=True,
        ).count()
        low_stock = Stock.objects.filter(
            quantity__lte=F('min_threshold'),
            quantity__gt=F('min_threshold') * 0.5,
            product__is_active=True,
        ).count()

        # Top payment method in current period
        top_method_row = (
            curr_qs.values('payment_method')
            .annotate(cnt=Count('id'))
            .order_by('-cnt')
            .first()
        )
        top_payment_method = top_method_row['payment_method'] if top_method_row else None

        return Response({
            'period': period,
            'revenue': {
                'current': curr_revenue,
                'previous': prev_revenue,
                'change_pct': _change_pct(curr_revenue, prev_revenue),
            },
            'transactions': {
                'current': curr_tx,
                'previous': prev_tx,
                'change_pct': _change_pct(curr_tx, prev_tx),
            },
            'avg_basket': {
                'current': curr_avg,
                'previous': prev_avg,
                'change_pct': _change_pct(curr_avg, prev_avg),
            },
            'new_clients': {
                'current': curr_clients,
                'previous': prev_clients,
                'change_pct': _change_pct(curr_clients, prev_clients),
            },
            'stock_alerts': {
                'low': low_stock,
                'critical': critical_stock,
            },
            'top_payment_method': top_payment_method,
        })


# ─── Sales helpers ────────────────────────────────────────────────────────────

_TRUNC_FN = {
    'hour': TruncHour,
    'day': TruncDate,
    'week': TruncWeek,
    'month': TruncMonth,
}

_PERIOD_FMT = {
    'hour': '%Y-%m-%dT%H:00',
    'day': '%Y-%m-%d',
    'week': '%Y-%m-%d',   # ISO week start (Monday)
    'month': '%Y-%m',
}


def _fmt_period(value, granularity: str) -> str:
    if hasattr(value, 'strftime'):
        return value.strftime(_PERIOD_FMT[granularity])
    return str(value)


class SalesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        granularity = request.query_params.get('granularity', 'day')
        if granularity not in _TRUNC_FN:
            granularity = 'day'

        today = timezone.now().date()
        default_start = today - timedelta(days=30)
        _midnight = timezone.datetime.min.time()

        raw_start = request.query_params.get('start')
        raw_end = request.query_params.get('end')

        try:
            start_date = (
                timezone.datetime.strptime(raw_start, '%Y-%m-%d').date()
                if raw_start else default_start
            )
        except ValueError:
            start_date = default_start

        try:
            end_date = (
                timezone.datetime.strptime(raw_end, '%Y-%m-%d').date()
                if raw_end else today
            )
        except ValueError:
            end_date = today

        start_dt = timezone.make_aware(timezone.datetime.combine(start_date, _midnight))
        end_dt = timezone.make_aware(
            timezone.datetime.combine(end_date, timezone.datetime.max.time())
        )

        rows = (
            Sale.objects.filter(created_at__range=(start_dt, end_dt))
            .annotate(period=_TRUNC_FN[granularity]('created_at'))
            .values('period')
            .annotate(
                revenue=Sum('total_amount'),
                transactions=Count('id'),
            )
            .order_by('period')
        )

        data = []
        for row in rows:
            tx = row['transactions']
            rev = row['revenue'] or 0
            data.append({
                'period': _fmt_period(row['period'], granularity),
                'revenue': rev,
                'transactions': tx,
                'avg_basket': round(rev / tx) if tx else 0,
            })

        total_revenue = sum(r['revenue'] for r in data)
        total_tx = sum(r['transactions'] for r in data)
        avg_basket = round(total_revenue / total_tx) if total_tx else 0
        peak_row = max(data, key=lambda r: r['revenue'], default=None)

        return Response({
            'granularity': granularity,
            'start': start_date.isoformat(),
            'end': end_date.isoformat(),
            'data': data,
            'summary': {
                'total_revenue': total_revenue,
                'total_transactions': total_tx,
                'avg_basket': avg_basket,
                'peak_day': peak_row['period'] if peak_row else None,
            },
        })


class ProductsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period = request.query_params.get('period', 'month')
        limit = int(request.query_params.get('limit', 10))
        since = _period_start(period)

        # --- top sellers ---
        top_sellers_qs = (
            SaleItem.objects
            .filter(sale__created_at__gte=since)
            .values('product__id', 'product__name', 'product__category__name')
            .annotate(
                total_sold=Sum('quantity'),
                revenue=Sum('subtotal'),
            )
            .order_by('-total_sold')[:limit]
        )
        top_sellers = [
            {
                'product_id': row['product__id'],
                'product_name': row['product__name'],
                'category': row['product__category__name'] or '',
                'total_sold': row['total_sold'],
                'revenue': row['revenue'],
            }
            for row in top_sellers_qs
        ]

        # --- slow movers (active products with 0 sales during the period) ---
        sold_product_ids = (
            SaleItem.objects
            .filter(sale__created_at__gte=since)
            .values_list('product_id', flat=True)
            .distinct()
        )
        slow_movers_qs = (
            Product.objects
            .filter(is_active=True)
            .exclude(id__in=sold_product_ids)
            .select_related('category')
            .order_by('created_at')[:limit]
        )
        now = timezone.now()
        slow_movers = [
            {
                'product_id': p.id,
                'product_name': p.name,
                'category': p.category.name if p.category else '',
                'total_sold': 0,
                'days_without_sale': (now - p.created_at).days,
            }
            for p in slow_movers_qs
        ]

        # --- by category ---
        category_sales_qs = (
            SaleItem.objects
            .filter(sale__created_at__gte=since)
            .values('product__category__name')
            .annotate(
                revenue=Sum('subtotal'),
                units_sold=Sum('quantity'),
            )
            .order_by('-revenue')
        )
        total_revenue = sum(row['revenue'] for row in category_sales_qs) or 1
        by_category = [
            {
                'category': row['product__category__name'] or 'Sans catégorie',
                'revenue': row['revenue'],
                'units_sold': row['units_sold'],
                'pct_of_total': round(row['revenue'] / total_revenue * 100, 1),
            }
            for row in category_sales_qs
        ]

        # --- counts ---
        new_products = Product.objects.filter(created_at__gte=since).count()
        inactive_products = Product.objects.filter(is_active=False).count()

        return Response({
            'top_sellers': top_sellers,
            'slow_movers': slow_movers,
            'by_category': by_category,
            'new_products': new_products,
            'inactive_products': inactive_products,
        })


class ClientsView(APIView):
    """GET /api/statistics/clients/?period=month|year"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        period = request.query_params.get('period', 'month')
        since = _period_start(period)

        sales_in_period = Sale.objects.filter(created_at__gte=since)

        # Top clients — ranked by total spend in the period
        top_clients_qs = (
            sales_in_period
            .filter(client__isnull=False)
            .values('client__id', 'client__name')
            .annotate(
                total_spent=Sum('total_amount'),
                total_orders=Count('id'),
            )
            .order_by('-total_spent')[:10]
        )
        top_clients = [
            {
                'client_id': row['client__id'],
                'client_name': row['client__name'],
                'total_spent': row['total_spent'] or 0,
                'total_orders': row['total_orders'],
                'avg_basket': (
                    round((row['total_spent'] or 0) / row['total_orders'])
                    if row['total_orders'] else 0
                ),
            }
            for row in top_clients_qs
        ]

        # New clients created in the period
        new_clients_count = Client.objects.filter(created_at__gte=since).count()

        # Returning clients — made ≥2 purchases during the period
        returning_clients_count = (
            sales_in_period
            .filter(client__isnull=False)
            .values('client_id')
            .annotate(orders=Count('id'))
            .filter(orders__gte=2)
            .count()
        )

        # Clients with outstanding credit balance
        credit_qs = Client.objects.filter(credit_balance__gt=0).aggregate(
            count=Count('id'),
            total_credit=Sum('credit_balance'),
        )

        # Evolution by calendar month within the period
        by_period_qs = (
            Client.objects
            .filter(created_at__gte=since)
            .annotate(bucket=TruncMonth('created_at'))
            .values('bucket')
            .annotate(new_clients=Count('id'))
            .order_by('bucket')
        )

        # Active clients per bucket (at least one sale in that month)
        active_by_bucket = {
            row['bucket']: row['cnt']
            for row in (
                Sale.objects
                .filter(created_at__gte=since, client__isnull=False)
                .annotate(bucket=TruncMonth('created_at'))
                .values('bucket')
                .annotate(cnt=Count('client_id', distinct=True))
            )
        }

        by_period = [
            {
                'period': row['bucket'].strftime('%Y-%m') if row['bucket'] else None,
                'new_clients': row['new_clients'],
                'active_clients': active_by_bucket.get(row['bucket'], 0),
            }
            for row in by_period_qs
        ]

        return Response({
            'top_clients': top_clients,
            'new_clients_this_period': new_clients_count,
            'returning_clients': returning_clients_count,
            'clients_with_credit': {
                'count': credit_qs['count'] or 0,
                'total_credit': credit_qs['total_credit'] or 0,
            },
            'by_period': by_period,
        })


class CashiersView(APIView):
    """GET /api/statistics/cashiers/?period=week|month"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        period = request.query_params.get('period', 'month')
        since = _period_start(period)

        cashier_qs = (
            Sale.objects
            .filter(created_at__gte=since, cashier__isnull=False)
            .values(
                'cashier__id',
                'cashier__first_name',
                'cashier__last_name',
                'cashier__username',
            )
            .annotate(
                total_sales=Count('id'),
                total_revenue=Sum('total_amount'),
                total_items=Sum('items__quantity'),
            )
            .order_by('-total_revenue')
        )

        data = []
        for row in cashier_qs:
            total_sales = row['total_sales'] or 0
            total_revenue = row['total_revenue'] or 0
            total_items = row['total_items'] or 0

            first = row['cashier__first_name'] or ''
            last = row['cashier__last_name'] or ''
            full_name = f'{first} {last}'.strip() or row['cashier__username']

            data.append({
                'cashier_id': row['cashier__id'],
                'cashier_name': full_name,
                'total_sales': total_sales,
                'total_revenue': total_revenue,
                'avg_basket': round(total_revenue / total_sales) if total_sales else 0,
                'avg_items_per_sale': (
                    round(total_items / total_sales, 2) if total_sales else 0.0
                ),
            })

        return Response({'data': data})


class PaymentMethodsView(APIView):
    """GET /api/statistics/payment-methods/?period=week|month"""

    permission_classes = [IsAuthenticated]

    _LABELS = {
        'cash': 'Espèces',
        'mobile_money': 'Mobile Money',
        'card': 'Carte',
        'credit': 'Crédit',
    }

    def get(self, request):
        period = request.query_params.get('period', 'month')
        since = _period_start(period)

        aggregates = list(
            Sale.objects
            .filter(created_at__gte=since)
            .values('payment_method')
            .annotate(
                count=Count('id'),
                total=Sum('total_amount'),
            )
            .order_by('-total')
        )

        total_revenue = sum(row['total'] or 0 for row in aggregates)

        data = [
            {
                'method': row['payment_method'],
                'label': self._LABELS.get(row['payment_method'], row['payment_method']),
                'count': row['count'],
                'total': row['total'] or 0,
                'pct': (
                    round((row['total'] or 0) / total_revenue * 100, 1)
                    if total_revenue else 0.0
                ),
            }
            for row in aggregates
        ]

        return Response({'data': data, 'total_revenue': total_revenue})


class StockView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Annotate each stock row with its value (quantity * selling_price)
        stocks = (
            Stock.objects
            .select_related('product')
            .annotate(
                line_value=ExpressionWrapper(
                    F('quantity') * F('product__selling_price'),
                    output_field=DecimalField(),
                )
            )
        )

        total_value = stocks.aggregate(tv=Sum('line_value'))['tv'] or 0
        total_products = stocks.count()

        # Status breakdown — mirrors the Stock.status property logic:
        #   critical : quantity <= min_threshold * 0.5
        #   low      : quantity <= min_threshold  (and > min_threshold * 0.5)
        #   normal   : quantity > min_threshold
        breakdown = {'normal': {'count': 0, 'value': 0},
                     'low':    {'count': 0, 'value': 0},
                     'critical': {'count': 0, 'value': 0}}
        alerts = []

        for s in stocks:
            lv = int(s.line_value or 0)
            if s.quantity <= s.min_threshold * 0.5:
                status = 'critical'
            elif s.quantity <= s.min_threshold:
                status = 'low'
            else:
                status = 'normal'

            breakdown[status]['count'] += 1
            breakdown[status]['value'] += lv

            if status in ('critical', 'low'):
                alerts.append({
                    'product_id': s.product_id,
                    'product_name': s.product.name,
                    'quantity': s.quantity,
                    'min_threshold': s.min_threshold,
                    'status': status,
                })

        alerts.sort(key=lambda a: (0 if a['status'] == 'critical' else 1, a['quantity']))

        top_value_products = sorted(
            [
                {
                    'product_name': s.product.name,
                    'quantity': s.quantity,
                    'value': int(s.line_value or 0),
                }
                for s in stocks
            ],
            key=lambda x: x['value'],
            reverse=True,
        )[:10]

        return Response({
            'total_value': int(total_value),
            'total_products': total_products,
            'status_breakdown': breakdown,
            'alerts': alerts,
            'top_value_products': top_value_products,
        })
