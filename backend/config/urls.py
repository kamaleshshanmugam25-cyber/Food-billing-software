from django.contrib import admin
from django.urls import path, include
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    """
    Restaurant POS Backend API Status & Directory
    """
    return Response({
        'message': 'Restaurant Billing & POS Management System API is live and operational.',
        'frontend_application_url': 'http://127.0.0.1:5173/',
        'instructions': 'Open http://127.0.0.1:5173/ in your browser to access the complete Restaurant POS interface.',
        'endpoints': {
            'admin': '/admin/',
            'auth_login': '/api/auth/login/',
            'auth_me': '/api/auth/me/',
            'settings': '/api/settings/',
            'menu_items': '/api/menu/items/',
            'menu_categories': '/api/menu/categories/',
            'orders': '/api/orders/',
            'reports_dashboard': '/api/reports/dashboard/',
            'reports_analytics': '/api/reports/sales-analytics/',
        }
    })

urlpatterns = [
    path('', api_root, name='root'),
    path('api/', api_root, name='api_root'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/settings/', include('apps.settings_app.urls')),
    path('api/menu/', include('apps.menu.urls')),
    path('api/orders/', include('apps.orders.urls')),
    path('api/reports/', include('apps.reports.urls')),
]
