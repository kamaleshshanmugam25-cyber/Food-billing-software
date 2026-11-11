import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  IndianRupee, 
  ShoppingBag, 
  TrendingUp, 
  Receipt,
  PieChart,
  RefreshCw,
  UtensilsCrossed,
  CreditCard
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';

const Reports = () => {
  const { settings } = useSettings();
  const toast = useToast();

  const [period, setPeriod] = useState('today'); // 'today' | '7days' | '30days' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const params = { period };
      if (period === 'custom') {
        if (!startDate || !endDate) return;
        params.start_date = startDate;
        params.end_date = endDate;
      }

      const res = await api.get('/reports/sales-analytics/', { params });
      setAnalytics(res.data);
    } catch (err) {
      toast.error('Failed to load sales analytics.');
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate, toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const token = localStorage.getItem('pos_token');
    const url = `${api.defaults.baseURL}/reports/export-summary-csv/?${params.toString()}`;

    fetch(url, {
      headers: { Authorization: `Token ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `sales_report_${analytics?.start_date}_${analytics?.end_date}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success('Sales report exported to CSV.');
      })
      .catch(() => toast.error('Failed to export CSV.'));
  };

  const summary = analytics?.summary;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Date Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-charcoal-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-charcoal-900 tracking-tight">
            Sales & Financial Reporting
          </h2>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Verified database metrics distinguishing gross sales, discounts, taxes, refunds, and net revenue.
          </p>
        </div>

        {/* Period Switcher & Date Range */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-charcoal-100 p-1 rounded-xl text-xs font-semibold text-charcoal-700">
            {[
              { id: 'today', label: 'Today' },
              { id: '7days', label: '7 Days' },
              { id: '30days', label: '30 Days' },
              { id: 'custom', label: 'Custom' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === tab.id
                    ? 'bg-primary-800 text-white shadow-xs font-bold'
                    : 'hover:text-charcoal-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center space-x-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 text-xs border border-charcoal-300 rounded-lg text-charcoal-800"
              />
              <span className="text-xs text-charcoal-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 text-xs border border-charcoal-300 rounded-lg text-charcoal-800"
              />
            </div>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-charcoal-800 hover:bg-charcoal-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-accent-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-800 rounded-full animate-spin"></div>
          <p className="mt-2 text-xs text-charcoal-500">Compiling Financial Calculations...</p>
        </div>
      ) : (
        <>
          {/* Detailed Financial Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Net Sales */}
            <div className="bg-white p-4 rounded-xl border border-charcoal-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">
                Net Revenue
              </span>
              <h4 className="text-base font-extrabold text-primary-800 mt-1">
                {formatCurrency(summary?.net_sales, settings.currency_symbol)}
              </h4>
              <p className="text-[10px] text-charcoal-500 mt-0.5">Completed bills</p>
            </div>

            {/* Gross Sales */}
            <div className="bg-white p-4 rounded-xl border border-charcoal-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">
                Gross (Subtotal)
              </span>
              <h4 className="text-base font-bold text-charcoal-900 mt-1">
                {formatCurrency(summary?.gross_sales, settings.currency_symbol)}
              </h4>
              <p className="text-[10px] text-charcoal-500 mt-0.5">Before discounts</p>
            </div>

            {/* Discounts */}
            <div className="bg-white p-4 rounded-xl border border-charcoal-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">
                Discounts Given
              </span>
              <h4 className="text-base font-bold text-amber-700 mt-1">
                {formatCurrency(summary?.total_discounts, settings.currency_symbol)}
              </h4>
              <p className="text-[10px] text-charcoal-500 mt-0.5">Authorized off</p>
            </div>

            {/* Tax Collected */}
            <div className="bg-white p-4 rounded-xl border border-charcoal-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">
                Tax Collected
              </span>
              <h4 className="text-base font-bold text-charcoal-900 mt-1">
                {formatCurrency(summary?.total_tax, settings.currency_symbol)}
              </h4>
              <p className="text-[10px] text-charcoal-500 mt-0.5">{settings.tax_name || 'GST'}</p>
            </div>

            {/* Orders Count & Ticket */}
            <div className="bg-white p-4 rounded-xl border border-charcoal-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">
                Total Orders
              </span>
              <h4 className="text-base font-bold text-charcoal-900 mt-1">
                {summary?.orders_count || 0}
              </h4>
              <p className="text-[10px] text-charcoal-500 mt-0.5">
                Avg: {formatCurrency(summary?.avg_order_value, settings.currency_symbol)}
              </p>
            </div>

            {/* Refunded / Cancelled */}
            <div className="bg-white p-4 rounded-xl border border-charcoal-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">
                Refunds / Cancel
              </span>
              <h4 className="text-base font-bold text-rose-700 mt-1">
                {formatCurrency(summary?.refunded_amount, settings.currency_symbol)}
              </h4>
              <p className="text-[10px] text-charcoal-500 mt-0.5">
                {summary?.cancelled_orders_count || 0} cancelled
              </p>
            </div>
          </div>

          {/* Timeline Visual Chart & Payment Methods */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Timeline Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-charcoal-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-charcoal-800">Revenue Progression</h3>
                  <p className="text-xs text-charcoal-500">Daily net sales across selected period</p>
                </div>
              </div>

              {analytics?.timeline?.length > 0 ? (
                <div className="h-56 flex items-end justify-between pt-6 px-2 gap-2 border-b border-charcoal-200">
                  {analytics.timeline.map((point, idx) => {
                    const maxVal = Math.max(...analytics.timeline.map((p) => p.sales), 100);
                    const heightPct = Math.max(8, Math.round((point.sales / maxVal) * 100));

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center group relative">
                        {/* Hover Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-charcoal-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap pointer-events-none z-20 shadow-md">
                          {formatCurrency(point.sales, settings.currency_symbol)} ({point.orders} bills)
                        </div>

                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full max-w-[36px] bg-primary-800 hover:bg-primary-900 rounded-t transition-all group-hover:scale-y-105"
                        ></div>

                        <span className="text-[10px] font-semibold text-charcoal-500 mt-2 truncate w-full text-center">
                          {point.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center text-charcoal-400 text-xs">
                  No daily points recorded in this period.
                </div>
              )}
            </div>

            {/* Payment Method Distribution */}
            <div className="bg-white p-6 rounded-2xl border border-charcoal-200/80 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-charcoal-800">Payment Channels</h3>
                  <p className="text-xs text-charcoal-500">Method distribution</p>
                </div>
                <CreditCard className="w-4 h-4 text-charcoal-400" />
              </div>

              <div className="space-y-3 flex-1 flex flex-col justify-center">
                {analytics?.payment_methods?.length > 0 ? (
                  analytics.payment_methods.map((pm, idx) => (
                    <div key={idx} className="p-3 bg-charcoal-50 rounded-xl border border-charcoal-200">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-charcoal-900">{pm.label}</span>
                        <span className="text-xs font-extrabold text-primary-800">
                          {formatCurrency(pm.amount, settings.currency_symbol)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-charcoal-500">
                        <span>{pm.count} transactions</span>
                        <span>
                          {summary?.net_sales > 0
                            ? Math.round((Number(pm.amount) / Number(summary.net_sales)) * 100)
                            : 0}
                          % of net
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-charcoal-400 text-xs">No payment data recorded.</p>
                )}
              </div>
            </div>
          </div>

          {/* Best Selling Items Table */}
          <div className="bg-white rounded-2xl border border-charcoal-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-charcoal-100">
              <h3 className="text-sm font-bold text-charcoal-800">Best-Selling Food Items</h3>
              <p className="text-xs text-charcoal-500">Top ranked items by quantity sold and revenue generated</p>
            </div>

            {analytics?.top_items?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-charcoal-50/80 text-charcoal-500 font-semibold uppercase text-[10px] tracking-wider border-b border-charcoal-100">
                    <tr>
                      <th className="py-3 px-5 text-center">Rank</th>
                      <th className="py-3 px-4">Item Name</th>
                      <th className="py-3 px-4 text-center">Quantity Sold</th>
                      <th className="py-3 px-5 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-charcoal-100 text-charcoal-700">
                    {analytics.top_items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-charcoal-50/60 transition-colors">
                        <td className="py-3 px-5 text-center font-bold text-primary-800">
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-4 font-bold text-charcoal-900">{it.name}</td>
                        <td className="py-3 px-4 text-center font-extrabold text-charcoal-800">
                          {it.quantity}
                        </td>
                        <td className="py-3 px-5 text-right font-extrabold text-charcoal-900">
                          {formatCurrency(it.revenue, settings.currency_symbol)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-charcoal-400 text-xs">
                No items sold in this period.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
