from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import FoodCategory, FoodItem
from .serializers import FoodCategorySerializer, FoodItemSerializer
from apps.accounts.permissions import IsAdminOrReadOnly

class FoodCategoryViewSet(viewsets.ModelViewSet):
    queryset = FoodCategory.objects.all().order_by('display_order', 'name')
    serializer_class = FoodCategorySerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        # Non-admins or POS screen can filter for only active categories
        active_only = self.request.query_params.get('active_only')
        if active_only == 'true':
            qs = qs.filter(is_active=True)
        return qs

class FoodItemViewSet(viewsets.ModelViewSet):
    queryset = FoodItem.objects.select_related('category').all().order_by('category__display_order', 'name')
    serializer_class = FoodItemSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        category_id = self.request.query_params.get('category')
        is_available = self.request.query_params.get('is_available')
        search = self.request.query_params.get('search')
        active_category = self.request.query_params.get('active_category')

        if category_id:
            qs = qs.filter(category_id=category_id)
        if is_available is not None:
            if is_available.lower() == 'true':
                qs = qs.filter(is_available=True)
            elif is_available.lower() == 'false':
                qs = qs.filter(is_available=False)
        if active_category == 'true':
            qs = qs.filter(category__is_active=True)
        if search:
            qs = qs.filter(
                Q(name__icontains=search) | 
                Q(sku__icontains=search) |
                Q(description__icontains=search)
            )
        return qs

    @action(detail=False, methods=['post'], url_path='clear-sample-data')
    def clear_sample_data(self, request):
        """Allows administrator to clear sample development menu items."""
        deleted_count, _ = FoodItem.objects.filter(is_sample_data=True).delete()
        return Response({
            'message': f"Successfully removed {deleted_count} sample items.",
            'deleted_count': deleted_count
        }, status=status.HTTP_200_OK)
