from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import StaffProfile, Role
from apps.settings_app.models import RestaurantSettings
from apps.menu.models import FoodCategory, FoodItem
from apps.orders.models import Order, OrderItem, OrderType, OrderStatus
from apps.orders.services import calculate_order_financials, round_money
from apps.payments.models import Payment, PaymentMethod, PaymentStatus

class OrderFinancialsAndCalculationsTest(TestCase):
    def setUp(self):
        self.settings = RestaurantSettings.get_settings()
        self.settings.tax_enabled = True
        self.settings.tax_rate_percent = Decimal('5.00')
        self.settings.is_tax_inclusive = False
        self.settings.allow_discounts = True
        self.settings.max_discount_percent = Decimal('20.00')
        self.settings.save()

        self.category = FoodCategory.objects.create(name="Biryani", display_order=1)
        self.item1 = FoodItem.objects.create(
            sku="BIR-001", name="Chicken Biryani", 
            category=self.category, price=Decimal('200.00'), is_available=True
        )
        self.item2 = FoodItem.objects.create(
            sku="BEV-001", name="Filter Coffee", 
            category=self.category, price=Decimal('30.00'), is_available=True
        )
        self.unavailable_item = FoodItem.objects.create(
            sku="OUT-001", name="Mutton Chop", 
            category=self.category, price=Decimal('300.00'), is_available=False
        )

    def test_subtotal_calculation(self):
        """Verify subtotal = sum(unit_price * qty) with exact Decimals."""
        cart = [
            {'food_item_id': self.item1.id, 'quantity': 2}, # 200 * 2 = 400.00
            {'food_item_id': self.item2.id, 'quantity': 3}, # 30 * 3 = 90.00
        ]
        calc = calculate_order_financials(cart, discount_percent=Decimal('0.00'), settings=self.settings)
        self.assertEqual(calc['subtotal'], Decimal('490.00'))
        self.assertEqual(calc['discount_amount'], Decimal('0.00'))
        self.assertEqual(calc['taxable_amount'], Decimal('490.00'))
        # 5% of 490 = 24.50
        self.assertEqual(calc['tax_amount'], Decimal('24.50'))
        self.assertEqual(calc['total_amount'], Decimal('514.50'))

    def test_discount_calculation(self):
        """Verify authorized discount is properly calculated and deducted."""
        cart = [{'food_item_id': self.item1.id, 'quantity': 2}] # 400.00
        # 10% discount
        calc = calculate_order_financials(cart, discount_percent=Decimal('10.00'), settings=self.settings)
        self.assertEqual(calc['subtotal'], Decimal('400.00'))
        self.assertEqual(calc['discount_amount'], Decimal('40.00'))
        self.assertEqual(calc['taxable_amount'], Decimal('360.00'))
        # 5% of 360 = 18.00
        self.assertEqual(calc['tax_amount'], Decimal('18.00'))
        self.assertEqual(calc['total_amount'], Decimal('378.00'))

    def test_tax_inclusive_calculation(self):
        """Verify tax-inclusive mode calculates base price and tax cleanly without changing total."""
        self.settings.is_tax_inclusive = True
        self.settings.save()

        cart = [{'food_item_id': self.item1.id, 'quantity': 1}] # 200.00 inclusive of 5% tax
        calc = calculate_order_financials(cart, discount_percent=Decimal('0.00'), settings=self.settings)
        # Total payable must be exactly 200.00
        self.assertEqual(calc['total_amount'], Decimal('200.00'))
        # Base taxable = 200 / 1.05 = 190.48
        self.assertEqual(calc['taxable_amount'], Decimal('190.48'))
        # Tax = 200 - 190.48 = 9.52
        self.assertEqual(calc['tax_amount'], Decimal('9.52'))

    def test_invalid_quantity_rejected(self):
        """Prevent quantities <= 0."""
        cart = [{'food_item_id': self.item1.id, 'quantity': 0}]
        with self.assertRaises(ValueError):
            calculate_order_financials(cart, settings=self.settings)

    def test_unavailable_item_prevented_from_ordering(self):
        """Ensure unavailable items throw an error and cannot be added."""
        cart = [{'food_item_id': self.unavailable_item.id, 'quantity': 1}]
        with self.assertRaises(ValueError):
            calculate_order_financials(cart, settings=self.settings)

    def test_unauthorized_discount_rejected(self):
        """Exceeding max discount percent must raise ValueError."""
        cart = [{'food_item_id': self.item1.id, 'quantity': 1}]
        # 25% exceeds max 20% limit
        with self.assertRaises(ValueError):
            calculate_order_financials(cart, discount_percent=Decimal('25.00'), settings=self.settings)

class OrderCreationAndPersistenceAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(username='admin', password='pass', email='admin@pos.com')
        self.cashier = User.objects.create_user(username='cashier', password='pass', email='cashier@pos.com')
        self.cashier.profile.role = Role.CASHIER
        self.cashier.profile.save()
        self.admin.profile.role = Role.ADMIN
        self.admin.profile.save()

        self.category = FoodCategory.objects.create(name="Mains", display_order=1)
        self.item = FoodItem.objects.create(
            sku="MN-01", name="Paneer Butter Masala", 
            category=self.category, price=Decimal('220.00'), is_available=True
        )

        self.settings = RestaurantSettings.get_settings()
        self.settings.tax_enabled = True
        self.settings.tax_rate_percent = Decimal('5.00')
        self.settings.is_tax_inclusive = False
        self.settings.save()

    def test_order_creation_persists_in_database(self):
        """Verify creating an order saves Order, OrderItem snapshots, and Payment."""
        self.client.force_authenticate(user=self.cashier)

        payload = {
            "order_type": "dine_in",
            "table_number": "T-12",
            "customer_name": "Test Customer",
            "items": [{"food_item_id": self.item.id, "quantity": 2}], # 220 * 2 = 440 + 5% (22) = 462.00
            "discount_percent": "0.00",
            "payment_method": "cash",
            "amount_received": "500.00",
            "client_order_token": "unique-token-12345"
        }

        response = self.client.post('/api/orders/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data

        # Check DB
        order = Order.objects.get(order_number=data['order_number'])
        self.assertEqual(order.subtotal, Decimal('440.00'))
        self.assertEqual(order.tax_amount, Decimal('22.00'))
        self.assertEqual(order.total_amount, Decimal('462.00'))
        self.assertEqual(order.payment.payment_method, 'cash')
        self.assertEqual(order.payment.amount_received, Decimal('500.00'))
        self.assertEqual(order.payment.change_due, Decimal('38.00'))

        # Check snapshot
        line = order.items.first()
        self.assertEqual(line.item_name, "Paneer Butter Masala")
        self.assertEqual(line.unit_price, Decimal('220.00'))
        self.assertEqual(line.quantity, 2)
        self.assertEqual(line.line_total, Decimal('440.00'))

    def test_price_change_does_not_affect_historical_order(self):
        """Verify editing a menu price does not change historical receipts."""
        self.client.force_authenticate(user=self.cashier)

        # Create order at price 220.00
        payload = {
            "order_type": "takeaway",
            "customer_name": "Historical Test",
            "items": [{"food_item_id": self.item.id, "quantity": 1}],
            "discount_percent": "0.00",
            "payment_method": "upi",
            "client_order_token": "history-token-1"
        }
        res = self.client.post('/api/orders/', payload, format='json')
        order_num = res.data['order_number']
        orig_total = Decimal(res.data['total_amount'])

        # Now change the menu item price from 220 to 350
        self.item.price = Decimal('350.00')
        self.item.save()

        # Retrieve historical order
        order = Order.objects.get(order_number=order_num)
        self.assertEqual(order.total_amount, orig_total)
        self.assertEqual(order.items.first().unit_price, Decimal('220.00'))

    def test_duplicate_submission_prevention(self):
        """Re-submitting with identical client_order_token returns existing order without creating duplicate."""
        self.client.force_authenticate(user=self.cashier)

        payload = {
            "order_type": "dine_in",
            "table_number": "T-5",
            "items": [{"food_item_id": self.item.id, "quantity": 1}],
            "discount_percent": "0.00",
            "payment_method": "card",
            "client_order_token": "idempotent-token-999"
        }

        # First request
        res1 = self.client.post('/api/orders/', payload, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Duplicate request with same token
        res2 = self.client.post('/api/orders/', payload, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res1.data['order_number'], res2.data['order_number'])
        self.assertEqual(Order.objects.filter(client_order_token="idempotent-token-999").count(), 1)

    def test_cash_payment_insufficient_amount_rejected(self):
        """Cash amount received less than total payable must be rejected."""
        self.client.force_authenticate(user=self.cashier)

        payload = {
            "order_type": "dine_in",
            "table_number": "T-1",
            "items": [{"food_item_id": self.item.id, "quantity": 1}], # Total is 231.00
            "discount_percent": "0.00",
            "payment_method": "cash",
            "amount_received": "200.00", # Insufficient!
        }
        res = self.client.post('/api/orders/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', res.data)

    def test_role_permissions(self):
        """Verify cashier cannot edit restaurant settings, but admin can."""
        # Cashier attempt to modify settings
        self.client.force_authenticate(user=self.cashier)
        res = self.client.put('/api/settings/', {"restaurant_name": "Hacked Name"}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Admin attempt to modify settings
        self.client.force_authenticate(user=self.admin)
        res_admin = self.client.put('/api/settings/', {"restaurant_name": "Updated Name"}, format='json')
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)
        self.assertEqual(res_admin.data['restaurant_name'], "Updated Name")
