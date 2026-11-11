from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal

class FoodCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default='')
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Food Categories"
        ordering = ['display_order', 'name']

    def __str__(self):
        return self.name

class FoodItem(models.Model):
    sku = models.CharField(max_length=50, unique=True, db_index=True, help_text="Unique Item Code / SKU")
    name = models.CharField(max_length=150, db_index=True)
    category = models.ForeignKey(FoodCategory, on_delete=models.PROTECT, related_name='items')
    description = models.TextField(blank=True, default='')
    price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Item price in major currency units (e.g. ₹ 150.00)"
    )
    is_available = models.BooleanField(default=True, db_index=True)
    image_url = models.TextField(blank=True, default='', help_text="Image data URL (local upload from PC) or web image URL")
    is_sample_data = models.BooleanField(default=False, help_text="Flag indicating default seed/sample item")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category__display_order', 'name']

    def __str__(self):
        return f"{self.name} ({self.sku}) - ₹{self.price}"
