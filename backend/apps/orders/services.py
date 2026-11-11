from decimal import Decimal, ROUND_HALF_UP
from datetime import date
from django.utils import timezone
from apps.menu.models import FoodItem
from apps.settings_app.models import RestaurantSettings

def round_money(val: Decimal) -> Decimal:
    """Safely round decimal values to 2 decimal places using ROUND_HALF_UP."""
    return val.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def generate_order_number() -> str:
    """Generates a human-friendly, unique, sequential order number: ORD-YYYYMMDD-0001."""
    today_str = timezone.localdate().strftime('%Y%m%d')
    prefix = f"ORD-{today_str}-"
    
    # Import Order locally to prevent circular imports
    from apps.orders.models import Order
    
    last_order = Order.objects.filter(order_number__startswith=prefix).order_by('-order_number').first()
    if last_order:
        try:
            seq_part = last_order.order_number.split('-')[-1]
            seq_num = int(seq_part) + 1
        except (ValueError, IndexError):
            seq_num = 1
    else:
        seq_num = 1
    return f"{prefix}{seq_num:04d}"

def calculate_order_financials(cart_items, discount_percent=Decimal('0.00'), settings=None):
    """
    Authoritative backend calculation of order financial breakdown.
    Guarantees exact Decimal arithmetic and compliance with restaurant tax & discount policies.
    """
    if settings is None:
        settings = RestaurantSettings.get_settings()

    # Normalize discount
    discount_pct = Decimal(str(discount_percent or 0.00))
    if discount_pct < Decimal('0.00'):
        raise ValueError("Discount percent cannot be negative.")
    
    if not settings.allow_discounts and discount_pct > Decimal('0.00'):
        raise ValueError("Discounts are currently disabled in restaurant settings.")

    if discount_pct > settings.max_discount_percent:
        raise ValueError(f"Discount of {discount_pct}% exceeds maximum authorized limit of {settings.max_discount_percent}%.")

    if not cart_items:
        raise ValueError("Order must contain at least one food item.")

    # Fetch food items from database
    item_ids = [item['food_item_id'] for item in cart_items]
    food_items_map = {item.id: item for item in FoodItem.objects.filter(id__in=item_ids)}

    line_items = []
    subtotal = Decimal('0.00')

    for item_data in cart_items:
        item_id = item_data['food_item_id']
        qty = int(item_data.get('quantity', 0))

        if qty <= 0:
            raise ValueError(f"Invalid quantity {qty} specified. Quantity must be at least 1.")

        food_item = food_items_map.get(item_id)
        if not food_item:
            raise ValueError(f"Food item with ID {item_id} not found.")

        if not food_item.is_available:
            raise ValueError(f"'{food_item.name}' is currently marked unavailable and cannot be ordered.")

        unit_price = Decimal(str(food_item.price))
        line_total = round_money(unit_price * qty)
        subtotal += line_total

        line_items.append({
            'food_item': food_item,
            'item_name': food_item.name,
            'item_sku': food_item.sku,
            'unit_price': unit_price,
            'quantity': qty,
            'line_total': line_total,
        })

    subtotal = round_money(subtotal)
    discount_amount = round_money(subtotal * (discount_pct / Decimal('100.00')))
    amount_after_discount = subtotal - discount_amount

    tax_rate = Decimal(str(settings.tax_rate_percent if settings.tax_enabled else Decimal('0.00')))
    tax_name = settings.tax_name if settings.tax_enabled else 'Tax'
    is_tax_inclusive = settings.is_tax_inclusive and settings.tax_enabled

    if not settings.tax_enabled or tax_rate == Decimal('0.00'):
        taxable_amount = amount_after_discount
        tax_amount = Decimal('0.00')
        total_amount = amount_after_discount
    elif is_tax_inclusive:
        # Price includes tax: base taxable = amount / (1 + tax_rate/100)
        divisor = Decimal('1.00') + (tax_rate / Decimal('100.00'))
        taxable_amount = round_money(amount_after_discount / divisor)
        tax_amount = round_money(amount_after_discount - taxable_amount)
        total_amount = amount_after_discount
    else:
        # Exclusive tax: tax is added on top of taxable amount
        taxable_amount = amount_after_discount
        tax_amount = round_money(taxable_amount * (tax_rate / Decimal('100.00')))
        total_amount = round_money(taxable_amount + tax_amount)

    return {
        'line_items': line_items,
        'subtotal': subtotal,
        'discount_percent': discount_pct,
        'discount_amount': discount_amount,
        'taxable_amount': taxable_amount,
        'tax_name': tax_name,
        'tax_rate_percent': tax_rate,
        'tax_amount': tax_amount,
        'is_tax_inclusive': is_tax_inclusive,
        'total_amount': total_amount,
    }
