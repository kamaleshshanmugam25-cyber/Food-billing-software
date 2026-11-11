from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import StaffProfile, Role
from apps.menu.models import FoodCategory, FoodItem
from apps.orders.models import Order, OrderItem, OrderType, OrderStatus
from apps.payments.models import Payment, PaymentMethod, PaymentStatus

class SalesReportCalculationsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(username='admin', password='pass', email='admin@test.com')
        self.client.force_authenticate(user=self.user)

        self.category = FoodCategory.objects.create(name="Beverages", display_order=1)
        self.item = FoodItem.objects.create(
            sku="TEA-01", name="Special Tea", category=self.category, price=Decimal('20.00'), is_available=True
        )

        # Create 1 Completed Order: Subtotal 100, Tax 5, Total 105
        self.completed_order = Order.objects.create(
            order_number="ORD-TEST-001",
            order_type=OrderType.DINE_IN,
            table_number="T-1",
            status=OrderStatus.COMPLETED,
            subtotal=Decimal('100.00'),
            discount_amount=Decimal('0.00'),
            taxable_amount=Decimal('100.00'),
            tax_amount=Decimal('5.00'),
            total_amount=Decimal('105.00'),
            cashier=self.user
        )
        OrderItem.objects.create(
            order=self.completed_order,
            food_item=self.item,
            item_name=self.item.name,
            item_sku=self.item.sku,
            unit_price=Decimal('20.00'),
            quantity=5,
            line_total=Decimal('100.00')
        )
        Payment.objects.create(
            order=self.completed_order,
            payment_method=PaymentMethod.UPI,
            amount_payable=Decimal('105.00'),
            amount_received=Decimal('105.00'),
            change_due=Decimal('0.00'),
            payment_status=PaymentStatus.COMPLETED
        )

        # Create 1 Cancelled/Refunded Order: Total 50 (must NOT be counted in net sales!)
        self.cancelled_order = Order.objects.create(
            order_number="ORD-TEST-002",
            order_type=OrderType.TAKEAWAY,
            status=OrderStatus.CANCELLED,
            cancellation_reason="Customer changed mind",
            subtotal=Decimal('50.00'),
            discount_amount=Decimal('0.00'),
            taxable_amount=Decimal('50.00'),
            tax_amount=Decimal('2.50'),
            total_amount=Decimal('52.50'),
            cashier=self.user
        )

    def test_dashboard_report_excludes_cancelled_orders_from_net_sales(self):
        """Dashboard must calculate net sales from ONLY completed orders, isolating refunded transactions."""
        res = self.client.get('/api/reports/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data

        # Only 1 completed order (105.00)
        self.assertEqual(Decimal(data['today_sales']), Decimal('105.00'))
        self.assertEqual(data['today_orders_count'], 1)
        self.assertEqual(Decimal(data['today_avg_order_value']), Decimal('105.00'))
        self.assertEqual(data['today_cancelled_count'], 1)

    def test_sales_analytics_endpoint(self):
        """Sales analytics must return correct gross sales, tax, and net sales."""
        res = self.client.get('/api/reports/sales-analytics/?period=today')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        summary = res.data['summary']

        self.assertEqual(Decimal(summary['net_sales']), Decimal('105.00'))
        self.assertEqual(Decimal(summary['gross_sales']), Decimal('100.00'))
        self.assertEqual(Decimal(summary['total_tax']), Decimal('5.00'))
        self.assertEqual(Decimal(summary['refunded_amount']), Decimal('52.50'))
        self.assertEqual(summary['cancelled_orders_count'], 1)

    def test_export_summary_csv(self):
        """CSV export returns proper attachment and headers."""
        res = self.client.get('/api/reports/export-summary-csv/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res['Content-Type'], 'text/csv')
        self.assertIn('attachment', res['Content-Disposition'])
        content = res.content.decode('utf-8')
        self.assertIn('ORD-TEST-001', content)
