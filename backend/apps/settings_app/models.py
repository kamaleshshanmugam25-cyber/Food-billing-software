from django.db import models
from decimal import Decimal
from django.core.validators import MinValueValidator, MaxValueValidator

class RestaurantSettings(models.Model):
    restaurant_name = models.CharField(max_length=150, default="Green Spices Restaurant")
    tagline = models.CharField(max_length=200, blank=True, default="Authentic Dining & Culinary Delights")
    address = models.TextField(blank=True, default="124 Culinary Boulevard, Food District")
    phone = models.CharField(max_length=30, blank=True, default="+91 98765 43210")
    email = models.EmailField(blank=True, default="contact@greenspices.com")
    tax_id = models.CharField(max_length=50, blank=True, default="", help_text="GSTIN / VAT / Tax Registration ID")
    currency_symbol = models.CharField(max_length=10, default="₹")
    
    # Tax configuration
    tax_enabled = models.BooleanField(default=True, help_text="Enable or disable tax calculation")
    tax_name = models.CharField(max_length=50, default="GST", help_text="Label for tax, e.g., GST, VAT, Sales Tax")
    tax_rate_percent = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=Decimal("5.00"),
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))],
        help_text="Tax percentage (e.g., 5.00 for 5%)"
    )
    is_tax_inclusive = models.BooleanField(
        default=False, 
        help_text="If True, menu prices already include tax. If False, tax is added onto subtotal."
    )
    
    # Discount configuration
    allow_discounts = models.BooleanField(default=True, help_text="Allow cashiers to apply discounts")
    max_discount_percent = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=Decimal("20.00"),
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))],
        help_text="Maximum allowed discount percentage without manager override"
    )
    
    # Receipt options
    receipt_footer_message = models.TextField(
        default="Thank you for dining with us! Please visit again.", 
        blank=True
    )
    receipt_show_tax_id = models.BooleanField(default=True)
    receipt_printer_width = models.CharField(
        max_length=10, 
        default="80mm", 
        choices=[("58mm", "58 mm Thermal"), ("80mm", "80 mm Thermal")]
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Restaurant Settings"
        verbose_name_plural = "Restaurant Settings"

    def __str__(self):
        return f"{self.restaurant_name} Settings"

    @classmethod
    def get_settings(cls):
        settings, _ = cls.objects.get_or_create(id=1)
        return settings
