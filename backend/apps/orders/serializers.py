from rest_framework import serializers
from decimal import Decimal
from django.contrib.auth.models import User
from .models import Order, OrderItem, OrderType, OrderStatus, RestaurantTable, TableStatus
from apps.payments.models import Payment, PaymentMethod, PaymentStatus
from apps.accounts.serializers import UserSerializer

class RestaurantTableSerializer(serializers.ModelSerializer):
    assigned_staff_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    assigned_staff_name = serializers.SerializerMethodField()
    assigned_staff_username = serializers.CharField(source='assigned_staff.username', read_only=True, default=None)
    active_order_number = serializers.CharField(source='active_order.order_number', read_only=True, default=None)
    active_order_amount = serializers.DecimalField(source='active_order.total_amount', max_digits=12, decimal_places=2, read_only=True, default=None)

    class Meta:
        model = RestaurantTable
        fields = [
            'id', 'table_number', 'section', 'capacity', 'status',
            'assigned_staff', 'assigned_staff_id', 'assigned_staff_name',
            'assigned_staff_username', 'active_order', 'active_order_number',
            'active_order_amount', 'updated_at'
        ]
        read_only_fields = ['id', 'assigned_staff', 'active_order', 'updated_at']

    def get_assigned_staff_name(self, obj):
        if obj.assigned_staff:
            return f"{obj.assigned_staff.first_name} {obj.assigned_staff.last_name}".strip() or obj.assigned_staff.username
        return "Unassigned"

    def update(self, instance, validated_data):
        staff_id = validated_data.pop('assigned_staff_id', None)
        if staff_id is not None:
            if staff_id in [0, -1, None]:
                instance.assigned_staff = None
            else:
                instance.assigned_staff = User.objects.filter(id=staff_id).first()
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'food_item', 'item_name', 'item_sku', 'unit_price', 'quantity', 'line_total']

class OrderPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'payment_method', 'amount_payable', 'amount_received', 
            'change_due', 'payment_status', 'reference_note', 'created_at'
        ]

class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    payment = OrderPaymentSerializer(read_only=True)
    cashier = UserSerializer(read_only=True)
    waiter = UserSerializer(read_only=True)
    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'order_type', 'table_number', 
            'customer_name', 'customer_phone', 'delivery_partner', 'delivery_address',
            'waiter', 'waiter_name',
            'status', 'cancellation_reason', 
            'notes', 'subtotal', 'discount_percent', 'discount_amount', 
            'taxable_amount', 'tax_name', 'tax_rate_percent', 'tax_amount', 
            'is_tax_inclusive', 'total_amount', 'cashier', 'client_order_token', 
            'items', 'payment', 'item_count', 'created_at', 'updated_at'
        ]

class OrderListSerializer(serializers.ModelSerializer):
    payment_method = serializers.CharField(source='payment.payment_method', read_only=True, default='cash')
    payment_status = serializers.CharField(source='payment.payment_status', read_only=True, default='completed')
    item_count = serializers.IntegerField(read_only=True)
    cashier_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'order_type', 'table_number', 
            'customer_name', 'customer_phone', 'delivery_partner', 'delivery_address',
            'waiter_name',
            'status', 'total_amount', 
            'item_count', 'payment_method', 'payment_status', 'cashier_name', 
            'created_at'
        ]

    def get_cashier_name(self, obj):
        if obj.cashier:
            return f"{obj.cashier.first_name} {obj.cashier.last_name}".strip() or obj.cashier.username
        return "Staff"

class CartItemInputSerializer(serializers.Serializer):
    food_item_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)

class OrderCalculateInputSerializer(serializers.Serializer):
    items = CartItemInputSerializer(many=True)
    discount_percent = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=Decimal('0.00'))

class OrderCreateInputSerializer(serializers.Serializer):
    order_type = serializers.ChoiceField(choices=OrderType.choices, default=OrderType.DINE_IN)
    table_number = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    customer_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    customer_phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default='')
    delivery_partner = serializers.CharField(max_length=50, required=False, allow_blank=True, default='Direct')
    delivery_address = serializers.CharField(required=False, allow_blank=True, default='')
    waiter_id = serializers.IntegerField(required=False, allow_null=True, default=None)
    waiter_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    
    items = CartItemInputSerializer(many=True)
    discount_percent = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=Decimal('0.00'))
    
    # Payment fields
    payment_method = serializers.ChoiceField(choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    amount_received = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=None)
    reference_note = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    
    # Idempotency token to prevent duplicate order submissions
    client_order_token = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')

class IncomingOnlineOrderSerializer(serializers.Serializer):
    customer_name = serializers.CharField(max_length=150, required=True)
    customer_phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default='')
    delivery_partner = serializers.CharField(max_length=50, required=False, default='Direct Online')
    delivery_address = serializers.CharField(required=False, allow_blank=True, default='')
    payment_method = serializers.ChoiceField(choices=PaymentMethod.choices, default=PaymentMethod.UPI)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    items = CartItemInputSerializer(many=True)

class OrderCancelInputSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=300, required=True)
