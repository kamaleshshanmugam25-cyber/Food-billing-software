from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, RestaurantTableViewSet

router = DefaultRouter()
router.register(r'tables', RestaurantTableViewSet, basename='table')
router.register(r'', OrderViewSet, basename='order')

urlpatterns = [
    path('', include(router.urls)),
]
