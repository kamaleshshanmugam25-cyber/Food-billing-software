from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal
from apps.menu.models import FoodItem

class OrderType(models.TextChoices):
    DINE_IN = 'dine_in', 'Dine-In'
    TAKEAWAY = 'takeaway', 'Takeaway'
    ONLINE = 'online', 'Online Delivery'

class OrderStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    ACCEPTED = 'accepted', 'Accepted'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'
    REFUNDED = 'refunded', 'Refunded'

class Order(models.Model):
    order_number = models.CharField(max_length=36, unique=True, db_index=True)
    order_type = models.CharField(max_length=20, choices=OrderType.choices, default=OrderType.DINE_IN)
    table_number = models.CharField(max_length=50, blank=True, default='')
    customer_name = models.CharField(max_length=150, blank=True, default='')
    customer_phone = models.CharField(max_length=30, blank=True, default='')
    delivery_partner = models.CharField(max_length=50, blank=True, default='Direct')
    delivery_address = models.TextField(blank=True, default='')
    
    # Waiter / Staff assigned to this order
    waiter = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='waiter_orders')
    waiter_name = models.CharField(max_length=150, blank=True, default='')
    
    status = models.CharField(max_length=20, choices=OrderStatus.choices, default=OrderStatus.COMPLETED, db_index=True)
    cancellation_reason = models.TextField(blank=True, default='')
    notes = models.TextField(blank=True, default='')

    # Exact decimal financial fields
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    taxable_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax_name = models.CharField(max_length=50, default='GST')
    tax_rate_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    is_tax_inclusive = models.BooleanField(default=False)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))

    cashier = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    client_order_token = models.CharField(max_length=100, unique=True, null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order_number} ({self.get_order_type_display()}) - {self.total_amount}"

    @property
    def item_count(self):
        return sum(item.quantity for item in self.items.all())

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    food_item = models.ForeignKey(FoodItem, on_delete=models.PROTECT, null=True, blank=True)
    # SNAPSHOT FIELDS (Preserves historical receipt integrity if menu price or name changes)
    item_name = models.CharField(max_length=150)
    item_sku = models.CharField(max_length=50)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.item_name} x {self.quantity} (@ {self.unit_price})"

class TableStatus(models.TextChoices):
    AVAILABLE = 'available', 'Available'
    OCCUPIED = 'occupied', 'Occupied'
    RESERVED = 'reserved', 'Reserved'

class RestaurantTable(models.Model):
    table_number = models.CharField(max_length=50, unique=True)
    section = models.CharField(max_length=50, default='Main Dining') # Main Dining, AC Hall, Family Section, Outdoor
    capacity = models.PositiveIntegerField(default=4)
    status = models.CharField(max_length=20, choices=TableStatus.choices, default=TableStatus.AVAILABLE)
    assigned_staff = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tables')
    active_order = models.ForeignKey('Order', on_delete=models.SET_NULL, null=True, blank=True, related_name='active_on_table')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['table_number']

    def __str__(self):
        staff_str = f" ({self.assigned_staff.first_name or self.assigned_staff.username})" if self.assigned_staff else ""
        return f"{self.table_number} - {self.section}{staff_str}"
