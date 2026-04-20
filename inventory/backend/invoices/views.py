from rest_framework import viewsets, filters
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsVendeurOrAdmin
from activity.utils import log_activity
from .models import Invoice
from .serializers import InvoiceSerializer


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Invoice.objects.select_related(
        'client', 'issued_by', 'sale'
    ).prefetch_related('sale__items__product')
    serializer_class = InvoiceSerializer
    permission_classes = [IsVendeurOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'client']
    search_fields = ['invoice_number', 'client__name']
    ordering_fields = ['issued_at', 'total_amount']
    ordering = ['-issued_at']

    def retrieve(self, request, *args, **kwargs):
        # Fetch the object once; pass it to the log to avoid a second DB hit.
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        try:
            log_activity(
                user=request.user,
                action='print',
                target_model='Invoice',
                target_id=instance.pk,
                description=(
                    f"Consultation/impression facture {instance.invoice_number}"
                    f" — {instance.total_amount} FCFA"
                ),
                request=request,
            )
        except Exception:
            pass
        return Response(serializer.data)
