import csv
from decimal import Decimal
from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Q
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from django.contrib.auth.models import User
from .models import Order, OrderItem, OrderStatus, OrderType, RestaurantTable, TableStatus
from .services import calculate_order_financials, generate_order_number, round_money
from .serializers import (
    OrderDetailSerializer, OrderListSerializer,
    OrderCalculateInputSerializer, OrderCreateInputSerializer,
    OrderCancelInputSerializer, IncomingOnlineOrderSerializer,
    RestaurantTableSerializer
)
from apps.menu.models import FoodItem
from apps.payments.models import Payment, PaymentMethod, PaymentStatus
from apps.settings_app.models import RestaurantSettings
from apps.accounts.permissions import IsCashierOrAdmin, IsAdminRole

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.select_related('cashier', 'payment').prefetch_related('items').all().order_by('-created_at')
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['retrieve', 'create']:
            return OrderDetailSerializer
        return OrderListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        search = params.get('search')
        if search:
            qs = qs.filter(
                Q(order_number__icontains=search) |
                Q(customer_name__icontains=search) |
                Q(table_number__icontains=search) |
                Q(customer_phone__icontains=search)
            )

        status_param = params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        order_type = params.get('order_type')
        if order_type:
            qs = qs.filter(order_type=order_type)

        payment_method = params.get('payment_method')
        if payment_method:
            qs = qs.filter(payment__payment_method=payment_method)

        start_date = params.get('start_date')
        if start_date:
            qs = qs.filter(created_at__date__gte=start_date)

        end_date = params.get('end_date')
        if end_date:
            qs = qs.filter(created_at__date__lte=end_date)

        return qs

    @action(detail=False, methods=['post'], url_path='calculate')
    def calculate(self, request):
        """
        Quote calculation endpoint for the POS Cart.
        Calculates exact subtotal, discount, taxable, tax, and final grand total.
        """
        serializer = OrderCalculateInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        items_data = serializer.validated_data['items']
        discount_pct = serializer.validated_data.get('discount_percent', Decimal('0.00'))

        try:
            financials = calculate_order_financials(
                cart_items=items_data,
                discount_percent=discount_pct
            )
            # Remove model instances from response dict
            response_items = []
            for line in financials['line_items']:
                response_items.append({
                    'food_item_id': line['food_item'].id,
                    'item_name': line['item_name'],
                    'item_sku': line['item_sku'],
                    'unit_price': str(line['unit_price']),
                    'quantity': line['quantity'],
                    'line_total': str(line['line_total']),
                })

            return Response({
                'items': response_items,
                'subtotal': str(financials['subtotal']),
                'discount_percent': str(financials['discount_percent']),
                'discount_amount': str(financials['discount_amount']),
                'taxable_amount': str(financials['taxable_amount']),
                'tax_name': financials['tax_name'],
                'tax_rate_percent': str(financials['tax_rate_percent']),
                'tax_amount': str(financials['tax_amount']),
                'is_tax_inclusive': financials['is_tax_inclusive'],
                'total_amount': str(financials['total_amount']),
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def create(self, request, *args, **kwargs):
        """
        Authoritatively calculates, validates, and creates Order, OrderItems snapshots, and Payment.
        Enforces idempotency using client_order_token.
        """
        serializer = OrderCreateInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        client_token = data.get('client_order_token')
        if client_token:
            # Check for duplicate submission
            existing_order = Order.objects.filter(client_order_token=client_token).first()
            if existing_order:
                detail_serializer = OrderDetailSerializer(existing_order)
                return Response(detail_serializer.data, status=status.HTTP_200_OK)

        settings = RestaurantSettings.get_settings()

        try:
            with transaction.atomic():
                financials = calculate_order_financials(
                    cart_items=data['items'],
                    discount_percent=data.get('discount_percent', Decimal('0.00')),
                    settings=settings
                )

                total_amount = financials['total_amount']
                payment_method = data.get('payment_method', PaymentMethod.CASH)
                amount_received = data.get('amount_received')

                # Validate payment amounts
                if payment_method == PaymentMethod.CASH:
                    if amount_received is None:
                        amount_received = total_amount
                    else:
                        amount_received = Decimal(str(amount_received))
                    if amount_received < total_amount:
                        return Response({
                            'error': f"Amount received (₹{amount_received}) cannot be less than total payable amount (₹{total_amount})."
                        }, status=status.HTTP_400_BAD_REQUEST)
                    change_due = round_money(amount_received - total_amount)
                else:
                    # UPI, Card, Other
                    amount_received = total_amount
                    change_due = Decimal('0.00')

                order_num = generate_order_number()

                waiter_id = data.get('waiter_id')
                waiter_user = None
                waiter_name = data.get('waiter_name', '').strip()
                if waiter_id:
                    waiter_user = User.objects.filter(id=waiter_id).first()
                    if waiter_user and not waiter_name:
                        waiter_name = f"{waiter_user.first_name} {waiter_user.last_name}".strip() or waiter_user.username

                order = Order.objects.create(
                    order_number=order_num,
                    order_type=data.get('order_type', OrderType.DINE_IN),
                    table_number=data.get('table_number', '').strip(),
                    customer_name=data.get('customer_name', '').strip(),
                    customer_phone=data.get('customer_phone', '').strip(),
                    delivery_partner=data.get('delivery_partner', 'Direct').strip(),
                    delivery_address=data.get('delivery_address', '').strip(),
                    waiter=waiter_user,
                    waiter_name=waiter_name,
                    notes=data.get('notes', '').strip(),
                    status=OrderStatus.COMPLETED,
                    subtotal=financials['subtotal'],
                    discount_percent=financials['discount_percent'],
                    discount_amount=financials['discount_amount'],
                    taxable_amount=financials['taxable_amount'],
                    tax_name=financials['tax_name'],
                    tax_rate_percent=financials['tax_rate_percent'],
                    tax_amount=financials['tax_amount'],
                    is_tax_inclusive=financials['is_tax_inclusive'],
                    total_amount=financials['total_amount'],
                    cashier=request.user if request.user.is_authenticated else None,
                    client_order_token=client_token or None
                )

                # Create OrderItem records (with snapshot data)
                order_items_to_create = []
                for line in financials['line_items']:
                    order_items_to_create.append(OrderItem(
                        order=order,
                        food_item=line['food_item'],
                        item_name=line['item_name'],
                        item_sku=line['item_sku'],
                        unit_price=line['unit_price'],
                        quantity=line['quantity'],
                        line_total=line['line_total'],
                    ))
                OrderItem.objects.bulk_create(order_items_to_create)

                # Create Payment record
                Payment.objects.create(
                    order=order,
                    payment_method=payment_method,
                    amount_payable=total_amount,
                    amount_received=amount_received,
                    change_due=change_due,
                    payment_status=PaymentStatus.COMPLETED,
                    reference_note=data.get('reference_note', '').strip()
                )

                response_serializer = OrderDetailSerializer(order)
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except ValueError as err:
            return Response({'error': str(err)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f"Failed to complete order: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='pending-online')
    def pending_online(self, request):
        """Returns all unaccepted/pending online orders for real-time cashier notifications."""
        orders = Order.objects.select_related('payment').prefetch_related('items').filter(
            order_type=OrderType.ONLINE,
            status=OrderStatus.PENDING
        ).order_by('-created_at')

        return Response({
            'count': orders.count(),
            'orders': OrderDetailSerializer(orders, many=True).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='accept')
    def accept_order(self, request, pk=None):
        """Accepts a pending online order and completes billing."""
        order = self.get_object()
        if order.status not in [OrderStatus.PENDING, OrderStatus.ACCEPTED]:
            return Response({'error': f"Order is already {order.status}."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            order.status = OrderStatus.COMPLETED
            if request.user.is_authenticated:
                order.cashier = request.user
            order.save()

            if hasattr(order, 'payment'):
                order.payment.payment_status = PaymentStatus.COMPLETED
                order.payment.save()

        return Response({
            'message': f"Online Order {order.order_number} accepted and billed!",
            'order': OrderDetailSerializer(order).data
        }, status=status.HTTP_200_OK)

    def _create_online_order(self, data):
        settings = RestaurantSettings.get_settings()
        with transaction.atomic():
            financials = calculate_order_financials(
                cart_items=data['items'],
                discount_percent=Decimal('0.00'),
                settings=settings
            )

            order_num = generate_order_number()
            payment_method = data.get('payment_method', PaymentMethod.UPI)
            total_amount = financials['total_amount']

            order = Order.objects.create(
                order_number=order_num,
                order_type=OrderType.ONLINE,
                customer_name=data.get('customer_name', '').strip(),
                customer_phone=data.get('customer_phone', '').strip(),
                delivery_partner=data.get('delivery_partner', 'Direct Online').strip(),
                delivery_address=data.get('delivery_address', '').strip(),
                notes=data.get('notes', '').strip(),
                status=OrderStatus.PENDING,
                subtotal=financials['subtotal'],
                discount_percent=financials['discount_percent'],
                discount_amount=financials['discount_amount'],
                taxable_amount=financials['taxable_amount'],
                tax_name=financials['tax_name'],
                tax_rate_percent=financials['tax_rate_percent'],
                tax_amount=financials['tax_amount'],
                is_tax_inclusive=financials['is_tax_inclusive'],
                total_amount=financials['total_amount']
            )

            items_to_create = []
            for line in financials['line_items']:
                items_to_create.append(OrderItem(
                    order=order,
                    food_item=line['food_item'],
                    item_name=line['item_name'],
                    item_sku=line['item_sku'],
                    unit_price=line['unit_price'],
                    quantity=line['quantity'],
                    line_total=line['line_total'],
                ))
            OrderItem.objects.bulk_create(items_to_create)

            is_cod = payment_method == PaymentMethod.CASH
            Payment.objects.create(
                order=order,
                payment_method=payment_method,
                amount_payable=total_amount,
                amount_received=Decimal('0.00') if is_cod else total_amount,
                change_due=Decimal('0.00'),
                payment_status=PaymentStatus.PENDING if is_cod else PaymentStatus.COMPLETED,
                reference_note=f"Online Order ({order.delivery_partner})"
            )

            return order

    @action(detail=False, methods=['post'], url_path='incoming-online', permission_classes=[permissions.AllowAny])
    def incoming_online(self, request):
        """Webhook/API for incoming customer or delivery-partner online orders."""
        serializer = IncomingOnlineOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            order = self._create_online_order(serializer.validated_data)
            return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='simulate-online')
    def simulate_online(self, request):
        """Instantly simulates an incoming online order with random available items for live testing."""
        import random
        available_items = list(FoodItem.objects.filter(is_available=True)[:10])
        if not available_items:
            return Response({'error': 'No available food items to simulate order.'}, status=status.HTTP_400_BAD_REQUEST)

        sample_customers = [
            ("Karthik Raja", "+91 98401 23456", "Flat 402, Royal Enclave, Gandhi Road", "Swiggy"),
            ("Priya Nair", "+91 97910 87654", "No. 18, 2nd Cross, Anna Nagar", "Zomato"),
            ("Arun Kumar", "+91 98840 55667", "Block B-12, Green View Apts", "Direct Online"),
            ("Deepa Sundaram", "+91 99402 11223", "Plot 45, Lakeview Street", "Website"),
        ]
        cust = random.choice(sample_customers)
        selected_food = random.sample(available_items, min(2, len(available_items)))

        items_payload = [
            {'food_item_id': item.id, 'quantity': random.randint(1, 2)}
            for item in selected_food
        ]

        payload = {
            'customer_name': cust[0],
            'customer_phone': cust[1],
            'delivery_address': cust[2],
            'delivery_partner': cust[3],
            'payment_method': PaymentMethod.UPI,
            'notes': 'Please deliver to doorstep. Handle with care.',
            'items': items_payload
        }

        try:
            order = self._create_online_order(payload)
            return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_order(self, request, pk=None):
        """Cancels an order, marks payment refunded/cancelled, and stores audit reason."""
        order = self.get_object()
        if order.status == OrderStatus.CANCELLED:
            return Response({'error': 'Order is already cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = OrderCancelInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data['reason']

        with transaction.atomic():
            order.status = OrderStatus.CANCELLED
            order.cancellation_reason = reason
            order.save()

            if hasattr(order, 'payment'):
                order.payment.payment_status = PaymentStatus.REFUNDED
                order.payment.save()

        return Response({
            'message': f"Order {order.order_number} has been cancelled.",
            'order': OrderDetailSerializer(order).data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        """Exports filtered orders to CSV format."""
        orders = self.get_queryset()

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="orders_export_{timezone.localdate().strftime("%Y%m%d")}.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'Order Number', 'Date', 'Type', 'Table / Customer', 
            'Items Count', 'Subtotal', 'Discount', 'Tax', 'Grand Total', 
            'Payment Method', 'Payment Status', 'Order Status', 'Cashier'
        ])

        for ord_obj in orders:
            method = ord_obj.payment.payment_method if hasattr(ord_obj, 'payment') else 'N/A'
            p_status = ord_obj.payment.payment_status if hasattr(ord_obj, 'payment') else 'N/A'
            table_cust = ord_obj.table_number if ord_obj.order_type == OrderType.DINE_IN else ord_obj.customer_name
            cashier_name = ord_obj.cashier.username if ord_obj.cashier else 'Staff'

            writer.writerow([
                ord_obj.order_number,
                ord_obj.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                ord_obj.get_order_type_display(),
                table_cust,
                ord_obj.item_count,
                ord_obj.subtotal,
                ord_obj.discount_amount,
                ord_obj.tax_amount,
                ord_obj.total_amount,
                method,
                p_status,
                ord_obj.get_status_display(),
                cashier_name
            ])

        return response

class RestaurantTableViewSet(viewsets.ModelViewSet):
    queryset = RestaurantTable.objects.select_related('assigned_staff', 'active_order').all()
    serializer_class = RestaurantTableSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'], url_path='assign-staff')
    def assign_staff(self, request, pk=None):
        table = self.get_object()
        staff_id = request.data.get('staff_id')
        if staff_id in [None, 0, -1, '']:
            table.assigned_staff = None
            msg = f"Table {table.table_number} is now unassigned."
        else:
            user = User.objects.filter(id=staff_id).first()
            if not user:
                return Response({'error': 'Staff user not found.'}, status=status.HTTP_404_NOT_FOUND)
            table.assigned_staff = user
            staff_name = f"{user.first_name} {user.last_name}".strip() or user.username
            msg = f"{staff_name} assigned to {table.table_number}."
        table.save()
        return Response({'message': msg, 'table': RestaurantTableSerializer(table).data}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='clear-table')
    def clear_table(self, request, pk=None):
        table = self.get_object()
        table.status = TableStatus.AVAILABLE
        table.active_order = None
        table.save()
        return Response({'message': f"{table.table_number} marked as Available.", 'table': RestaurantTableSerializer(table).data}, status=status.HTTP_200_OK)
