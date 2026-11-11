from rest_framework import serializers
from decimal import Decimal
from .models import FoodCategory, FoodItem

class FoodCategorySerializer(serializers.ModelSerializer):
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = FoodCategory
        fields = ['id', 'name', 'description', 'display_order', 'is_active', 'items_count', 'created_at', 'updated_at']

    def get_items_count(self, obj):
        return obj.items.count()

class FoodItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = FoodItem
        fields = [
            'id', 'sku', 'name', 'category', 'category_name', 
            'description', 'price', 'is_available', 'image_url', 
            'is_sample_data', 'created_at', 'updated_at'
        ]

    def validate_price(self, value):
        if value is None or value <= Decimal('0.00'):
            raise serializers.ValidationError("Price must be a positive number greater than 0.")
        return value

    def validate_sku(self, value):
        sku = value.strip().upper()
        item_id = self.instance.id if self.instance else None
        if FoodItem.objects.filter(sku__iexact=sku).exclude(id=item_id).exists():
            raise serializers.ValidationError(f"Item with SKU '{sku}' already exists.")
        return sku
