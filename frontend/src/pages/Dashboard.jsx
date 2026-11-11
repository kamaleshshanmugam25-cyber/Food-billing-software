import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IndianRupee, 
  ShoppingBag, 
  TrendingUp, 
  AlertCircle, 
  ArrowRight, 
  PlusCircle, 
  Receipt,
  UtensilsCrossed,
  Clock,
  Sparkles
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { useSettings } from '../context/SettingsContext';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { settings } = useSettings();
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/dashboard/');
      setData(res.data);
      setError('');
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError('Could not retrieve dashboard statistics. Please ensure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-800 rounded-full animate-spin"></div>
        <p className="mt-3 text-xs font-semibold text-charcoal-500">
          Calculating Real-time Sales Metrics...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-900 max-w-xl mx-auto mt-10">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-bold">Error Loading Dashboard</h4>
            <p className="text-xs mt-1 text-red-700">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchDashboardData}
          className="mt-4 px-3.5 py-1.5 bg-red-800 hover:bg-red-900 text-white rounded-lg text-xs font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  const hasOrdersToday = data && Number(data.today_orders_count) > 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-charcoal-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-charcoal-900 tracking-tight">
            Terminal Overview & Daily Sales
          </h2>
          <p className="text-xs text-charcoal-500 mt-1">
            Real-time analytics and transaction status calculated from verified database records.
          </p>
        </div>

        <button
          onClick={() => navigate('/pos')}
          className="flex items-center space-x-2 px-4 py-2.5 bg-primary-800 hover:bg-primary-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4 text-accent-400" />
          <span>Launch POS Billing</span>
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-xl border border-charcoal-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-primary-800 flex items-center justify-center border border-emerald-100">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-400">
              Today's Net Sales
            </p>
            <h3 className="text-xl font-extrabold text-charcoal-900 mt-0.5">
              {formatCurrency(data?.today_sales, settings.currency_symbol)}
            </h3>
            <p className="text-[10px] text-charcoal-500 mt-0.5">
              Tax: {formatCurrency(data?.today_tax_collected, settings.currency_symbol)}
            </p>
          </div>
        </div>

        {/* Orders Count */}
        <div className="bg-white p-5 rounded-xl border border-charcoal-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-accent-600 flex items-center justify-center border border-amber-100">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-400">
              Orders Completed
            </p>
            <h3 className="text-xl font-extrabold text-charcoal-900 mt-0.5">
              {data?.today_orders_count || 0}
            </h3>
            <p className="text-[10px] text-charcoal-500 mt-0.5">
              {data?.dine_in_count || 0} Dine-in · {data?.takeaway_count || 0} Takeaway
            </p>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white p-5 rounded-xl border border-charcoal-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-400">
              Avg Order Value
            </p>
            <h3 className="text-xl font-extrabold text-charcoal-900 mt-0.5">
              {formatCurrency(data?.today_avg_order_value, settings.currency_symbol)}
            </h3>
            <p className="text-[10px] text-charcoal-500 mt-0.5">
              Per completed bill
            </p>
          </div>
        </div>

        {/* Cancelled / Refunded */}
        <div className="bg-white p-5 rounded-xl border border-charcoal-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-400">
              Cancelled / Refunds
            </p>
            <h3 className="text-xl font-extrabold text-charcoal-900 mt-0.5">
              {data?.today_cancelled_count || 0}
            </h3>
            <p className="text-[10px] text-charcoal-500 mt-0.5">
              Audited transactions
            </p>
          </div>
        </div>
      </div>

      {/* Grid: 7-Day Trend Chart & Popular Food Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Trend Bar Visualizer */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-charcoal-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-charcoal-800">
                Recent 7-Day Sales Trend
              </h3>
              <p className="text-xs text-charcoal-500">
                Historical gross revenue breakdown per day
              </p>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 bg-charcoal-100 text-charcoal-700 rounded-md">
              Past 7 Days
            </span>
          </div>

          {/* Bar Chart Container */}
          <div className="h-52 flex items-end justify-between pt-6 px-2 gap-3 border-b border-charcoal-200">
            {data?.weekly_trend?.map((item, idx) => {
              const maxSale = Math.max(...(data?.weekly_trend?.map((t) => t.sales) || [1]), 100);
              const heightPercent = Math.max(8, Math.round((item.sales / maxSale) * 100));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative">
                  {/* Tooltip on Hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-charcoal-900 text-white text-[10px] py-1 px-2 rounded-md whitespace-nowrap pointer-events-none z-20 shadow-md">
                    {formatCurrency(item.sales, settings.currency_symbol)} ({item.orders} orders)
                  </div>

                  {/* Bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[42px] rounded-t-md transition-all duration-300 ${
                      item.sales > 0
                        ? 'bg-primary-800 hover:bg-primary-900 group-hover:scale-y-105'
                        : 'bg-charcoal-100'
                    }`}
                  ></div>

                  {/* Date Label */}
                  <span className="text-[11px] font-semibold text-charcoal-500 mt-2 truncate w-full text-center">
                    {item.date}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Popular Food Items */}
        <div className="bg-white p-6 rounded-2xl border border-charcoal-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-charcoal-800">Popular Food Items</h3>
              <p className="text-xs text-charcoal-500">Top sellers by volume</p>
            </div>
            <UtensilsCrossed className="w-4 h-4 text-charcoal-400" />
          </div>

          <div className="space-y-3">
            {data?.popular_items?.length > 0 ? (
              data.popular_items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-charcoal-50 transition-colors">
                  <div className="flex items-center space-x-3 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-primary-50 text-primary-800 text-[11px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-charcoal-800 truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-bold text-charcoal-900">
                      {item.quantity} sold
                    </span>
                    <p className="text-[10px] text-charcoal-500">
                      {formatCurrency(item.revenue, settings.currency_symbol)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-charcoal-400 text-xs">
                No orders recorded yet. Items will rank here once orders are placed.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white rounded-2xl border border-charcoal-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-charcoal-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-charcoal-800">Recent Transactions</h3>
            <p className="text-xs text-charcoal-500">Latest completed receipts and tables</p>
          </div>

          <button
            onClick={() => navigate('/orders')}
            className="flex items-center space-x-1 text-xs font-bold text-primary-800 hover:text-primary-900"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {data?.recent_orders?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-charcoal-50/70 text-charcoal-500 font-semibold uppercase text-[10px] tracking-wider border-b border-charcoal-100">
                <tr>
                  <th className="py-3 px-5">Order #</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Table / Customer</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-100 text-charcoal-700">
                {data.recent_orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-charcoal-50/60 transition-colors">
                    <td className="py-3 px-5 font-bold text-charcoal-900">
                      {ord.order_number}
                    </td>
                    <td className="py-3 px-4 text-charcoal-500">
                      {ord.created_at}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {ord.order_type}
                    </td>
                    <td className="py-3 px-4 font-medium text-charcoal-800">
                      {ord.table_or_customer}
                    </td>
                    <td className="py-3 px-4 uppercase text-[11px] font-semibold text-charcoal-600">
                      {ord.payment_method}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-charcoal-900">
                      {formatCurrency(ord.total_amount, settings.currency_symbol)}
                    </td>
                    <td className="py-3 px-5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ord.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {ord.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-charcoal-400 text-xs">
            <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-charcoal-300" />
            <p className="font-semibold text-charcoal-600">No transactions recorded yet today.</p>
            <p className="mt-1 text-charcoal-400">Click "Launch POS Billing" above to create your first order.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
