from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LoginView, LogoutView, MeView, StaffViewSet

router = DefaultRouter()
router.register(r'staff', StaffViewSet, basename='staff')

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth_login'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('me/', MeView.as_view(), name='auth_me'),
    path('', include(router.urls)),
]
