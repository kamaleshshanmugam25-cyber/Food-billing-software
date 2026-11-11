from django.db import models
from decimal import Decimal
from apps.orders.models import Order

class PaymentMethod(models.TextChoices):
    CASH = 'cash', 'Cash'
    UPI = 'upi', 'UPI'
    CARD = 'card', 'Card'
    OTHER = 'other', 'Other'

class PaymentStatus(models.TextChoices):
    COMPLETED = 'completed', 'Completed'
    PENDING = 'pending', 'Pending'
    REFUNDED = 'refunded', 'Refunded'

class Payment(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='payment')
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    amount_payable = models.DecimalField(max_digits=12, decimal_places=2)
    amount_received = models.DecimalField(max_digits=12, decimal_places=2)
    change_due = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.COMPLETED)
    reference_note = models.CharField(
        max_length=150, 
        blank=True, 
        default='', 
        help_text="Optional transaction reference (e.g. UPI Ref ID or Card Last 4 digits. No confidential credentials stored.)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment for {self.order.order_number}: {self.payment_method} - ₹{self.amount_payable}"
