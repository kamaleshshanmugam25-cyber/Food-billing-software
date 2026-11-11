import os
import sys
import django

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
from decimal import Decimal
from datetime import timedelta

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from django.utils import timezone
from apps.accounts.models import StaffProfile, Role
from apps.settings_app.models import RestaurantSettings
from apps.menu.models import FoodCategory, FoodItem
from apps.orders.models import Order, OrderItem, OrderType, OrderStatus
from apps.payments.models import Payment, PaymentMethod, PaymentStatus
from apps.orders.services import calculate_order_financials, round_money

def seed_database():
    print("🌱 Seeding Restaurant POS Database...")

    # 1. Seed Restaurant Settings
    settings, _ = RestaurantSettings.objects.get_or_create(id=1)
    settings.restaurant_name = "Green Spices Restaurant"
    settings.tagline = "Authentic Dining & Flavors"
    settings.address = "Plot 42, Marina Road, Food District, Chennai"
    settings.phone = "+91 98765 43210"
    settings.email = "billing@greenspices.com"
    settings.tax_id = "33ABCDE1234F1Z5"
    settings.currency_symbol = "₹"
    settings.tax_enabled = True
    settings.tax_name = "GST"
    settings.tax_rate_percent = Decimal("5.00")
    settings.is_tax_inclusive = False
    settings.allow_discounts = True
    settings.max_discount_percent = Decimal("20.00")
    settings.receipt_footer_message = "Thank you for dining with us! Please visit again."
    settings.receipt_printer_width = "80mm"
    settings.save()
    print("✅ Restaurant settings initialized.")

    # 2. Seed Users
    # Admin User
    admin_user, created = User.objects.get_or_create(username="admin", defaults={
        "first_name": "Rajesh",
        "last_name": "Kumar",
        "email": "admin@greenspices.com",
        "is_staff": True,
        "is_superuser": True
    })
    admin_user.set_password("admin123")
    admin_user.save()
    admin_profile, _ = StaffProfile.objects.get_or_create(user=admin_user)
    admin_profile.role = Role.ADMIN
    admin_profile.phone = "+91 98765 00001"
    admin_profile.save()

    # Cashier User
    cashier_user, created = User.objects.get_or_create(username="cashier", defaults={
        "first_name": "Priya",
        "last_name": "Sharma",
        "email": "cashier@greenspices.com",
        "is_staff": False,
        "is_superuser": False
    })
    cashier_user.set_password("cashier123")
    cashier_user.save()
    cashier_profile, _ = StaffProfile.objects.get_or_create(user=cashier_user)
    cashier_profile.role = Role.CASHIER
    cashier_profile.phone = "+91 98765 00002"
    cashier_profile.save()
    print("✅ Staff users created (Admin: admin / admin123, Cashier: cashier / cashier123).")

    # 3. Seed Food Categories
    categories_data = [
        {"name": "Biryani & Rice", "description": "Aromatic signature biryanis and fried rices", "order": 1},
        {"name": "Starters & Snacks", "description": "Crispy appetizing starters and tikkas", "order": 2},
        {"name": "South Indian Delights", "description": "Traditional dosas, idlis, and meals", "order": 3},
        {"name": "Main Course & Breads", "description": "Fresh Indian breads, curries and gravies", "order": 4},
        {"name": "Beverages & Desserts", "description": "Hot chai, filter coffee and fresh coolers", "order": 5},
    ]

    cat_map = {}
    for cat in categories_data:
        obj, _ = FoodCategory.objects.get_or_create(
            name=cat["name"],
            defaults={"description": cat["description"], "display_order": cat["order"], "is_active": True}
        )
        cat_map[cat["name"]] = obj

    print("✅ Food categories initialized.")

    # 4. Seed Sample Menu Items
    menu_items = [
        {
            "sku": "BIR-001",
            "name": "Chicken Biryani",
            "category": "Biryani & Rice",
            "price": Decimal("240.00"),
            "desc": "Fragrant basmati rice cooked with succulent chicken and aromatic whole spices.",
            "image": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80"
        },
        {
            "sku": "BIR-002",
            "name": "Mutton Biryani",
            "category": "Biryani & Rice",
            "price": Decimal("320.00"),
            "desc": "Tender mutton pieces slow-cooked with spiced saffron basmati rice.",
            "image": "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500&auto=format&fit=crop&q=80"
        },
        {
            "sku": "RIC-001",
            "name": "Chicken Fried Rice",
            "category": "Biryani & Rice",
            "price": Decimal("190.00"),
            "desc": "Wok-tossed long-grain rice with diced chicken, eggs, and crisp scallions.",
            "image": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=80"
        },
        {
            "sku": "RIC-002",
            "name": "Veg Fried Rice",
            "category": "Biryani & Rice",
            "price": Decimal("150.00"),
            "desc": "Wok-tossed rice with fresh seasonal vegetables and soy seasoning.",
            "image": "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500&auto=format&fit=crop&q=80"
        },
        {
            "sku": "STR-001",
            "name": "Chicken 65",
            "category": "Starters & Snacks",
            "price": Decimal("180.00"),
            "desc": "Spicy, deep-fried chicken marinated in crushed ginger, garlic, and curry leaves.",
            "image": "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=500&auto=format&fit=crop&q=80"
        },
        {
            "sku": "STR-002",
            "name": "Paneer Tikka",
            "category": "Starters & Snacks",
            "price": Decimal("170.00"),
            "desc": "Char-grilled cottage cheese cubes marinated in spiced yogurt.",
            "image": "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop&q=80"
        },
        {
            "sku": "DOS-001",
            "name": "Masala Dosa",
            "category": "South Indian Delights",
            "price": Decimal("85.00"),
            "desc": "Crispy fermented crepe stuffed with spiced mashed potato, served with chutneys & sambar.",
            "image": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=80"
        },
        {
            "sku": "MLS-001",
            "name": "Special South Indian Meals",
            "category": "South Indian Delights",
            "price": Decimal("130.00"),
            "desc": "Unlimited steamed rice, sambar, rasam, kootu, poriyal, curd, appalam, and sweet.",
            "image": "https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=500&auto=format&fit=crop&q=80"
        },
        {
            "sku": "BRD-001",
            "name": "Malabar Parotta (2 Pcs)",
            "category": "Main Course & Breads",
            "price": Decimal("50.00"),
            "desc": "Flaky, layered, golden Indian flatbread cooked on iron griddle.",
            "image": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80"
        },
        {
            "sku": "BRD-002",
            "name": "Butter Naan",
            "category": "Main Course & Breads",
            "price": Decimal("45.00"),
            "desc": "Soft leavened tandoor bread brushed with melted butter.",
            "image": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80"
        },
        {
            "sku": "BEV-001",
            "name": "Masala Tea",
            "category": "Beverages & Desserts",
            "price": Decimal("25.00"),
            "desc": "Hot brewed milk tea infused with cardamom, cloves, and fresh ginger.",
            "image": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80"
        },
        {
            "sku": "BEV-002",
            "name": "Filter Coffee",
            "category": "Beverages & Desserts",
            "price": Decimal("30.00"),
            "desc": "Authentic South Indian chicory-blend decoction frothed with boiling milk.",
            "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80"
        },
        {
            "sku": "BEV-003",
            "name": "Fresh Lime Juice",
            "category": "Beverages & Desserts",
            "price": Decimal("45.00"),
            "desc": "Refreshing hand-squeezed lime juice with mint and ice.",
            "image": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80"
        },
    ]

    for item in menu_items:
        FoodItem.objects.update_or_create(
            sku=item["sku"],
            defaults={
                "name": item["name"],
                "category": cat_map[item["category"]],
                "price": item["price"],
                "description": item["desc"],
                "image_url": item.get("image", ""),
                "is_available": True,
                "is_sample_data": True
            }
        )
    print(f"✅ {len(menu_items)} sample food items created and labeled.")

    # 5. Seed Initial Completed Orders (Historical & Today)
    today = timezone.localdate()
    all_items = list(FoodItem.objects.all())

    orders_to_create = [
        # Today
        {"days_ago": 0, "type": OrderType.DINE_IN, "table": "Table 4", "customer": "Anand", "items": [(all_items[0], 2), (all_items[4], 1), (all_items[10], 2)], "discount": Decimal("0.00"), "method": PaymentMethod.UPI},
        {"days_ago": 0, "type": OrderType.TAKEAWAY, "table": "", "customer": "Ravi K", "items": [(all_items[1], 1), (all_items[2], 1), (all_items[11], 2)], "discount": Decimal("5.00"), "method": PaymentMethod.CASH, "cash_rec": Decimal("600.00")},
        {"days_ago": 0, "type": OrderType.DINE_IN, "table": "Table 2", "customer": "Kavitha", "items": [(all_items[6], 2), (all_items[9], 2), (all_items[10], 2)], "discount": Decimal("0.00"), "method": PaymentMethod.CARD},
        {"days_ago": 0, "type": OrderType.DINE_IN, "table": "Table 7", "customer": "Suresh", "items": [(all_items[7], 2), (all_items[8], 4), (all_items[11], 2)], "discount": Decimal("10.00"), "method": PaymentMethod.UPI},
        # Yesterday
        {"days_ago": 1, "type": OrderType.DINE_IN, "table": "Table 1", "customer": "Mohan", "items": [(all_items[0], 3), (all_items[4], 2), (all_items[12], 3)], "discount": Decimal("0.00"), "method": PaymentMethod.CASH, "cash_rec": Decimal("1300.00")},
        {"days_ago": 1, "type": OrderType.TAKEAWAY, "table": "", "customer": "Deepa", "items": [(all_items[3], 2), (all_items[5], 2)], "discount": Decimal("0.00"), "method": PaymentMethod.UPI},
        # 2 Days ago
        {"days_ago": 2, "type": OrderType.DINE_IN, "table": "Table 5", "customer": "Vikram", "items": [(all_items[1], 2), (all_items[7], 1), (all_items[10], 2)], "discount": Decimal("5.00"), "method": PaymentMethod.CARD},
    ]

    order_seq = 1
    for order_data in orders_to_create:
        order_date = today - timedelta(days=order_data["days_ago"])
        cart = [{"food_item_id": it[0].id, "quantity": it[1]} for it in order_data["items"]]
        financials = calculate_order_financials(cart, discount_percent=order_data["discount"], settings=settings)

        order_num = f"ORD-{order_date.strftime('%Y%m%d')}-{order_seq:04d}"
        order_seq += 1

        order = Order.objects.create(
            order_number=order_num,
            order_type=order_data["type"],
            table_number=order_data["table"],
            customer_name=order_data["customer"],
            customer_phone="+91 98000 11111",
            status=OrderStatus.COMPLETED,
            subtotal=financials["subtotal"],
            discount_percent=financials["discount_percent"],
            discount_amount=financials["discount_amount"],
            taxable_amount=financials["taxable_amount"],
            tax_name=financials["tax_name"],
            tax_rate_percent=financials["tax_rate_percent"],
            tax_amount=financials["tax_amount"],
            is_tax_inclusive=financials["is_tax_inclusive"],
            total_amount=financials["total_amount"],
            cashier=admin_user,
        )
        # Update timestamp to match simulated day
        order.created_at = timezone.now() - timedelta(days=order_data["days_ago"], hours=order_seq % 8)
        order.save()

        # Create line item snapshots
        for line in financials["line_items"]:
            OrderItem.objects.create(
                order=order,
                food_item=line["food_item"],
                item_name=line["item_name"],
                item_sku=line["item_sku"],
                unit_price=line["unit_price"],
                quantity=line["quantity"],
                line_total=line["line_total"]
            )

        # Create payment
        method = order_data["method"]
        tot = financials["total_amount"]
        rec = order_data.get("cash_rec", tot)
        change = round_money(rec - tot) if method == PaymentMethod.CASH else Decimal("0.00")

        p = Payment.objects.create(
            order=order,
            payment_method=method,
            amount_payable=tot,
            amount_received=rec,
            change_due=change,
            payment_status=PaymentStatus.COMPLETED
        )
        p.created_at = order.created_at
        p.save()

    print(f"✅ Created {len(orders_to_create)} seed orders with payments.")
    print("\n🎉 Database successfully seeded with sample menu, settings, staff users, and initial transactions!")

if __name__ == '__main__':
    seed_database()
