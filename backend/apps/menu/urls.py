from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FoodCategoryViewSet, FoodItemViewSet

router = DefaultRouter()
router.register(r'categories', FoodCategoryViewSet, basename='category')
router.register(r'items', FoodItemViewSet, basename='item')

urlpatterns = [
    path('', include(router.urls)),
]
