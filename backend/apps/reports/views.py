import csv
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Count, Avg, F
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from apps.orders.models import Order, OrderItem, OrderStatus, OrderType
from apps.payments.models import Payment, PaymentMethod
from apps.accounts.permissions import IsAdminRole, IsCashierOrAdmin

class DashboardOverviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        
        # Today's completed orders
        today_completed_orders = Order.objects.filter(
            created_at__date=today,
            status=OrderStatus.COMPLETED
        )

        today_cancelled_orders = Order.objects.filter(
            created_at__date=today,
            status__in=[OrderStatus.CANCELLED, OrderStatus.REFUNDED]
        )

        today_totals = today_completed_orders.aggregate(
            total_sales=Sum('total_amount'),
            total_subtotal=Sum('subtotal'),
            total_tax=Sum('tax_amount'),
            total_discount=Sum('discount_amount'),
            orders_count=Count('id')
        )

        total_sales = today_totals['total_sales'] or Decimal('0.00')
        orders_count = today_totals['orders_count'] or 0
        avg_order_value = (total_sales / orders_count) if orders_count > 0 else Decimal('0.00')
        cancelled_count = today_cancelled_orders.count()

        # Order types today
        dine_in_count = today_completed_orders.filter(order_type=OrderType.DINE_IN).count()
        takeaway_count = today_completed_orders.filter(order_type=OrderType.TAKEAWAY).count()

        # Popular items (Last 7 days or today)
        popular_items = OrderItem.objects.filter(
            order__status=OrderStatus.COMPLETED,
            order__created_at__date__gte=today - timedelta(days=7)
        ).values('item_name').annotate(
            total_qty=Sum('quantity'),
            total_revenue=Sum('line_total')
        ).order_by('-total_qty')[:5]

        # Recent 6 orders
        recent_orders_qs = Order.objects.select_related('payment', 'cashier').all().order_by('-created_at')[:6]
        recent_orders = []
        for o in recent_orders_qs:
            recent_orders.append({
                'id': o.id,
                'order_number': o.order_number,
                'order_type': o.get_order_type_display(),
                'table_or_customer': o.table_number if o.order_type == OrderType.DINE_IN else (o.customer_name or 'Walk-in'),
                'total_amount': str(o.total_amount),
                'status': o.status,
                'payment_method': o.payment.get_payment_method_display() if hasattr(o, 'payment') else 'N/A',
                'created_at': o.created_at.strftime('%H:%M'),
            })

        # Last 7 days trend
        start_date_7d = today - timedelta(days=6)
        daily_trends = Order.objects.filter(
            status=OrderStatus.COMPLETED,
            created_at__date__gte=start_date_7d
        ).annotate(date=TruncDate('created_at')).values('date').annotate(
            sales=Sum('total_amount'),
            orders=Count('id')
        ).order_by('date')

        # Fill any missing dates in last 7 days with zero
        trend_map = {item['date']: item for item in daily_trends}
        filled_trends = []
        for i in range(7):
            d = start_date_7d + timedelta(days=i)
            entry = trend_map.get(d)
            filled_trends.append({
                'date': d.strftime('%d %b'),
                'raw_date': d.strftime('%Y-%m-%d'),
                'sales': float(entry['sales']) if entry else 0.0,
                'orders': entry['orders'] if entry else 0,
            })

        return Response({
            'today_sales': str(total_sales),
            'today_orders_count': orders_count,
            'today_avg_order_value': str(round(avg_order_value, 2)),
            'today_cancelled_count': cancelled_count,
            'today_tax_collected': str(today_totals['total_tax'] or Decimal('0.00')),
            'today_discounts': str(today_totals['total_discount'] or Decimal('0.00')),
            'dine_in_count': dine_in_count,
            'takeaway_count': takeaway_count,
            'popular_items': [
                {
                    'name': it['item_name'],
                    'quantity': it['total_qty'],
                    'revenue': str(it['total_revenue'])
                } for it in popular_items
            ],
            'recent_orders': recent_orders,
            'weekly_trend': filled_trends,
        }, status=status.HTTP_200_OK)

class SalesAnalyticsView(APIView):
    """Full sales reports endpoint with date filtering, breakdown, and summaries."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        period = request.query_params.get('period', 'today') # today, 7days, 30days, custom
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        if period == 'today':
            start_date = today
            end_date = today
        elif period == '7days':
            start_date = today - timedelta(days=6)
            end_date = today
        elif period == '30days':
            start_date = today - timedelta(days=29)
            end_date = today
        elif period == 'custom' and start_date_str and end_date_str:
            try:
                start_date = timezone.datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = timezone.datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                start_date = today
                end_date = today
        else:
            start_date = today
            end_date = today

        # Completed orders in range
        completed_qs = Order.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            status=OrderStatus.COMPLETED
        )

        cancelled_qs = Order.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            status__in=[OrderStatus.CANCELLED, OrderStatus.REFUNDED]
        )

        summary = completed_qs.aggregate(
            gross_sales=Sum('subtotal'),
            total_discounts=Sum('discount_amount'),
            taxable_amount=Sum('taxable_amount'),
            total_tax=Sum('tax_amount'),
            net_sales=Sum('total_amount'),
            orders_count=Count('id')
        )

        cancelled_summary = cancelled_qs.aggregate(
            refunded_amount=Sum('total_amount'),
            cancelled_count=Count('id')
        )

        net_sales = summary['net_sales'] or Decimal('0.00')
        orders_count = summary['orders_count'] or 0
        avg_ticket = (net_sales / orders_count) if orders_count > 0 else Decimal('0.00')

        # Payment methods breakdown
        payment_methods = Payment.objects.filter(
            order__created_at__date__gte=start_date,
            order__created_at__date__lte=end_date,
            order__status=OrderStatus.COMPLETED
        ).values('payment_method').annotate(
            count=Count('id'),
            total_amount=Sum('amount_payable')
        ).order_by('-total_amount')

        # Order type breakdown
        order_types = completed_qs.values('order_type').annotate(
            count=Count('id'),
            total_amount=Sum('total_amount')
        )

        # Top 10 items in range
        top_items = OrderItem.objects.filter(
            order__status=OrderStatus.COMPLETED,
            order__created_at__date__gte=start_date,
            order__created_at__date__lte=end_date
        ).values('item_name').annotate(
            total_qty=Sum('quantity'),
            total_revenue=Sum('line_total')
        ).order_by('-total_qty')[:10]

        # Daily chart points
        daily_points = completed_qs.annotate(
            day=TruncDate('created_at')
        ).values('day').annotate(
            sales=Sum('total_amount'),
            orders=Count('id')
        ).order_by('day')

        return Response({
            'period': period,
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
            'summary': {
                'gross_sales': str(summary['gross_sales'] or Decimal('0.00')),
                'total_discounts': str(summary['total_discounts'] or Decimal('0.00')),
                'taxable_amount': str(summary['taxable_amount'] or Decimal('0.00')),
                'total_tax': str(summary['total_tax'] or Decimal('0.00')),
                'net_sales': str(net_sales),
                'orders_count': orders_count,
                'avg_order_value': str(round(avg_ticket, 2)),
                'refunded_amount': str(cancelled_summary['refunded_amount'] or Decimal('0.00')),
                'cancelled_orders_count': cancelled_summary['cancelled_count'] or 0,
            },
            'payment_methods': [
                {
                    'method': pm['payment_method'],
                    'label': dict(PaymentMethod.choices).get(pm['payment_method'], pm['payment_method'].title()),
                    'count': pm['count'],
                    'amount': str(pm['total_amount'])
                } for pm in payment_methods
            ],
            'order_types': [
                {
                    'type': ot['order_type'],
                    'label': dict(OrderType.choices).get(ot['order_type'], ot['order_type'].title()),
                    'count': ot['count'],
                    'amount': str(ot['total_amount'])
                } for ot in order_types
            ],
            'top_items': [
                {
                    'name': it['item_name'],
                    'quantity': it['total_qty'],
                    'revenue': str(it['total_revenue'])
                } for it in top_items
            ],
            'timeline': [
                {
                    'date': dp['day'].strftime('%Y-%m-%d'),
                    'label': dp['day'].strftime('%d %b'),
                    'sales': float(dp['sales']),
                    'orders': dp['orders']
                } for dp in daily_points
            ]
        }, status=status.HTTP_200_OK)

class ExportReportsCSVView(APIView):
    """Exports sales report breakdown to CSV."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        if start_date_str and end_date_str:
            try:
                start_date = timezone.datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = timezone.datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                start_date = today
                end_date = today
        else:
            start_date = today - timedelta(days=30)
            end_date = today

        completed_qs = Order.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            status=OrderStatus.COMPLETED
        )

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="sales_report_{start_date}_{end_date}.csv"'
        writer = csv.writer(response)

        writer.writerow(['SALES SUMMARY REPORT', f"Period: {start_date} to {end_date}"])
        writer.writerow([])
        writer.writerow(['Order Number', 'Date & Time', 'Type', 'Table / Customer', 'Gross (Subtotal)', 'Discount', 'Tax', 'Net Sales', 'Payment Method', 'Cashier'])

        for ord_obj in completed_qs.select_related('payment', 'cashier'):
            writer.writerow([
                ord_obj.order_number,
                ord_obj.created_at.strftime('%Y-%m-%d %H:%M'),
                ord_obj.get_order_type_display(),
                ord_obj.table_number if ord_obj.order_type == OrderType.DINE_IN else ord_obj.customer_name,
                ord_obj.subtotal,
                ord_obj.discount_amount,
                ord_obj.tax_amount,
                ord_obj.total_amount,
                ord_obj.payment.get_payment_method_display() if hasattr(ord_obj, 'payment') else 'Cash',
                ord_obj.cashier.username if ord_obj.cashier else 'Staff'
            ])

        return response
