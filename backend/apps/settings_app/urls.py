from django.urls import path
from .views import RestaurantSettingsView

urlpatterns = [
    path('', RestaurantSettingsView.as_view(), name='restaurant_settings'),
]
