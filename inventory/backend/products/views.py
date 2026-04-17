from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsAdminRole, IsAdminOrReadOnly
from .models import Category, Product
from .serializers import CategorySerializer, ProductListSerializer, ProductDetailSerializer

try:
    from activity.utils import log_activity
except ImportError:
    log_activity = None


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminRole]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']
    pagination_class = None  # categories are few — return plain list, not paginated

    def perform_destroy(self, instance):
        if instance.products.filter(is_active=True).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                "Impossible de supprimer une catégorie contenant des produits actifs."
            )
        instance.delete()


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category', 'stock').filter(is_active=True)
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'barcode', 'description']
    ordering_fields = ['name', 'selling_price', 'created_at']
    ordering = ['name']

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        return ProductDetailSerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        if log_activity:
            try:
                log_activity(
                    user=self.request.user,
                    action='create',
                    target_model='Product',
                    target_id=instance.pk,
                    description=f"Produit créé : {instance.name} (réf: {getattr(instance, 'barcode', '') or instance.pk})",
                    request=self.request,
                )
            except Exception:
                pass

    def perform_update(self, serializer):
        instance = serializer.save()
        if log_activity:
            try:
                log_activity(
                    user=self.request.user,
                    action='update',
                    target_model='Product',
                    target_id=instance.pk,
                    description=f"Produit modifié : {instance.name}",
                    request=self.request,
                )
            except Exception:
                pass

    def perform_destroy(self, instance):
        if log_activity:
            try:
                log_activity(
                    user=self.request.user,
                    action='delete',
                    target_model='Product',
                    target_id=instance.pk,
                    description=f"Produit supprimé : {instance.name}",
                    request=self.request,
                )
            except Exception:
                pass
        instance.is_active = False
        instance.save()

    @action(detail=False, methods=['get'], url_path='barcode/(?P<code>[^/.]+)')
    def by_barcode(self, request, code=None):
        try:
            product = Product.objects.select_related('category', 'stock').get(
                barcode=code, is_active=True
            )
            return Response(ProductListSerializer(product).data)
        except Product.DoesNotExist:
            return Response({'detail': 'Produit non trouvé.'}, status=404)
