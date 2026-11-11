from django.urls import path
from .views import DashboardOverviewView, SalesAnalyticsView, ExportReportsCSVView

urlpatterns = [
    path('dashboard/', DashboardOverviewView.as_view(), name='reports_dashboard'),
    path('sales-analytics/', SalesAnalyticsView.as_view(), name='reports_analytics'),
    path('export-summary-csv/', ExportReportsCSVView.as_view(), name='reports_export_csv'),
]
