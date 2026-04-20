from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
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

    @action(detail=True, methods=['post'], url_path='upload-image', parser_classes=[MultiPartParser])
    def upload_image(self, request, pk=None):
        """Upload or replace the product image via Cloudinary."""
        product = self.get_object()
        if 'image' not in request.FILES:
            return Response({'error': 'Aucune image fournie.'}, status=400)

        # BUG-5 FIX: validation du type MIME côté backend avant envoi à Cloudinary
        ALLOWED_CONTENT_TYPES = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
        uploaded_file = request.FILES['image']
        if uploaded_file.content_type not in ALLOWED_CONTENT_TYPES:
            return Response(
                {
                    'error': (
                        f"Type de fichier non autorisé : {uploaded_file.content_type}. "
                        "Formats acceptés : JPEG, PNG, WebP, GIF."
                    )
                },
                status=400,
            )
        # Limite taille : 5 Mo
        if uploaded_file.size > 5 * 1024 * 1024:
            return Response({'error': 'L\'image ne doit pas dépasser 5 Mo.'}, status=400)

        product.image = uploaded_file
        product.save(update_fields=['image'])
        if log_activity:
            try:
                log_activity(
                    user=request.user,
                    action='update',
                    target_model='Product',
                    target_id=product.pk,
                    description=f"Image mise à jour pour {product.name}",
                    request=request,
                )
            except Exception:
                pass
        return Response(ProductListSerializer(product).data)

    @action(detail=False, methods=['get'], url_path='barcode/(?P<code>[^/.]+)')
    def by_barcode(self, request, code=None):
        # BUG-6 FIX: recherche insensible à la casse pour les références
        # alphanumériques saisies manuellement (les EAN-13 sont numériques,
        # mais les codes personnalisés peuvent varier en casse).
        try:
            product = Product.objects.select_related('category', 'stock').get(
                barcode__iexact=code, is_active=True
            )
            return Response(ProductListSerializer(product).data)
        except Product.DoesNotExist:
            return Response({'detail': 'Produit non trouvé.'}, status=404)

    @action(detail=True, methods=['post'], url_path='generate-barcode')
    def generate_barcode(self, request, pk=None):
        """Generate or regenerate an EAN-13 barcode for a product."""
        import random

        def _gen_ean13():
            for _ in range(20):
                digits = [random.randint(0, 9) for _ in range(12)]
                total = sum(d * (1 if i % 2 == 0 else 3) for i, d in enumerate(digits))
                check = (10 - (total % 10)) % 10
                code = ''.join(map(str, digits)) + str(check)
                if not Product.objects.filter(barcode=code).exclude(pk=pk).exists():
                    return code
            return None

        product = self.get_object()
        new_code = _gen_ean13()
        if not new_code:
            return Response({'detail': 'Impossible de générer un code unique.'}, status=500)
        product.barcode = new_code
        product.save(update_fields=['barcode', 'updated_at'])
        if log_activity:
            try:
                log_activity(
                    user=request.user,
                    action='update',
                    target_model='Product',
                    target_id=product.pk,
                    description=f"Code-barres généré pour {product.name} : {product.barcode}",
                    request=request,
                )
            except Exception:
                pass
        return Response(ProductListSerializer(product).data)
