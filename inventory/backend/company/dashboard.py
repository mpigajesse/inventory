from django.db.models import Sum, Count, F
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from sales.models import Sale, SaleItem
from products.models import Product
from clients.models import Client
from stock.models import Stock
from sales.serializers import SaleSerializer


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        # Today's sales
        today_sales = Sale.objects.filter(created_at__date=today)
        today_revenue = today_sales.aggregate(total=Sum('total_amount'))['total'] or 0
        today_count = today_sales.count()

        # Monthly revenue
        month_sales = Sale.objects.filter(created_at__date__gte=month_ago)
        month_revenue = month_sales.aggregate(total=Sum('total_amount'))['total'] or 0

        # Stock alerts — uses status property thresholds from Stock model
        low_stock = Stock.objects.filter(
            quantity__lte=F('min_threshold'),
            product__is_active=True,
        ).count()
        critical_stock = Stock.objects.filter(
            quantity__lte=F('min_threshold') * 0.5,
            product__is_active=True,
        ).count()

        # Counts
        total_products = Product.objects.filter(is_active=True).count()
        total_clients = Client.objects.filter(is_active=True).count()

        # Sales by day for last 7 days (sparkline / chart data)
        sales_by_day = list(
            Sale.objects.filter(created_at__date__gte=week_ago)
            .annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(total=Sum('total_amount'), count=Count('id'))
            .order_by('day')
        )

        # Top 5 products this month by units sold
        top_products = list(
            SaleItem.objects.filter(sale__created_at__date__gte=month_ago)
            .values('product__name')
            .annotate(total_sold=Sum('quantity'), revenue=Sum('subtotal'))
            .order_by('-total_sold')[:5]
        )

        # Recent sales (last 5)
        recent_sales = (
            Sale.objects.select_related('client', 'cashier')
            .prefetch_related('items__product')
            .order_by('-created_at')[:5]
        )
        recent_sales_data = SaleSerializer(recent_sales, many=True).data

        return Response({
            'today': {
                'revenue': today_revenue,
                'sales_count': today_count,
            },
            'month': {
                'revenue': month_revenue,
                'sales_count': month_sales.count(),
            },
            'stock': {
                'low_count': low_stock,
                'critical_count': critical_stock,
                'total_products': total_products,
            },
            'clients': {
                'total': total_clients,
            },
            'sales_by_day': sales_by_day,
            'top_products': top_products,
            'recent_sales': recent_sales_data,
        })
