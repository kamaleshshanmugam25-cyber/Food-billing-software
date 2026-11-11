from rest_framework import serializers
from .models import RestaurantSettings

class RestaurantSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantSettings
        fields = '__all__'
