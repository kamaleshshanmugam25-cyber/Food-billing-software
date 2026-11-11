import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Eye, 
  XCircle, 
  AlertCircle,
  Calendar,
  CheckCircle2,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import ThermalReceipt from '../components/ThermalReceipt';

const OrderHistory = () => {
  const { settings } = useSettings();
  const toast = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reprintOrder, setReprintOrder] = useState(null);
  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (paymentFilter) params.payment_method = paymentFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await api.get('/orders/', { params });
      setOrders(res.data);
    } catch (err) {
      toast.error('Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, paymentFilter, startDate, endDate, toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Load detailed order for modal
  const handleViewOrder = async (orderId) => {
    try {
      const res = await api.get(`/orders/${orderId}/`);
      setSelectedOrder(res.data);
    } catch (err) {
      toast.error('Could not load order details.');
    }
  };

  // Reprint Receipt
  const handleReprint = async (orderId) => {
    try {
      const res = await api.get(`/orders/${orderId}/`);
      setReprintOrder(res.data);
    } catch (err) {
      toast.error('Could not fetch receipt details for reprint.');
    }
  };

  // Cancel / Refund Order
  const handleCancelSubmit = async () => {
    if (!cancelReason.trim()) {
      toast.warning('Please provide a reason for cancelling this order.');
      return;
    }

    try {
      setCancelling(true);
      await api.post(`/orders/${cancelModalOrder.id}/cancel/`, { reason: cancelReason.trim() });
      toast.success(`Order ${cancelModalOrder.order_number} cancelled.`);
      setCancelModalOrder(null);
      setCancelReason('');
      fetchOrders();
      if (selectedOrder && selectedOrder.id === cancelModalOrder.id) {
        setSelectedOrder(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel order.');
    } finally {
      setCancelling(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.append('search', search.trim());
    if (statusFilter) params.append('status', statusFilter);
    if (paymentFilter) params.append('payment_method', paymentFilter);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const token = localStorage.getItem('pos_token');
    const url = `${api.defaults.baseURL}/orders/export-csv/?${params.toString()}`;
    
    // Trigger download using hidden link with auth header or window download
    fetch(url, {
      headers: { Authorization: `Token ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success('Orders exported to CSV.');
      })
      .catch(() => toast.error('Failed to export CSV.'));
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-charcoal-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-charcoal-900 tracking-tight">
            Order History & Audited Receipts
          </h2>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Full transactional log of past orders, payment receipts, reprints, and cancellations.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchOrders}
            className="p-2 text-charcoal-600 hover:text-charcoal-900 bg-charcoal-100 hover:bg-charcoal-200 rounded-lg text-xs font-semibold flex items-center space-x-1"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-charcoal-800 hover:bg-charcoal-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-accent-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-charcoal-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Order #, table..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-charcoal-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-800"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs border border-charcoal-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-800 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Payment Filter */}
        <div>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs border border-charcoal-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-800 font-medium"
          >
            <option value="">All Payments</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
          </select>
        </div>

        {/* Date From */}
        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-2 py-1 text-xs border border-charcoal-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-700"
          />
        </div>

        {/* Date To */}
        <div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-2 py-1 text-xs border border-charcoal-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-700"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-charcoal-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-800 rounded-full animate-spin"></div>
            <p className="mt-2 text-xs text-charcoal-500">Retrieving Order Records...</p>
          </div>
        ) : orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-charcoal-50/80 text-charcoal-500 font-semibold uppercase text-[10px] tracking-wider border-b border-charcoal-100">
                <tr>
                  <th className="py-3 px-5">Order #</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Table / Customer</th>
                  <th className="py-3 px-3 text-center">Items</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-100 text-charcoal-700">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-charcoal-50/60 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-charcoal-900 font-mono">
                      {ord.order_number}
                    </td>
                    <td className="py-3.5 px-4 text-charcoal-500">
                      {formatDateTime(ord.created_at)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold uppercase text-[11px]">
                      {ord.order_type === 'dine_in' ? (
                        <span className="text-charcoal-700">Dine-In</span>
                      ) : ord.order_type === 'online' ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-bold border border-emerald-200">
                          <span>Online • {ord.delivery_partner || 'Direct'}</span>
                        </span>
                      ) : (
                        <span className="text-charcoal-700">Takeaway</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-charcoal-800">
                      <p>{ord.table_number || ord.customer_name || 'Walk-In'}</p>
                      {ord.waiter_name && (
                        <p className="text-[10px] text-primary-700 font-semibold">
                          Server: {ord.waiter_name}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-charcoal-600">
                      {ord.item_count}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-charcoal-900">
                      {formatCurrency(ord.total_amount, settings.currency_symbol)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="uppercase text-[11px] font-bold text-charcoal-600 bg-charcoal-100 px-2 py-0.5 rounded">
                        {ord.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ord.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {ord.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right space-x-1 whitespace-nowrap">
                      {/* View Details */}
                      <button
                        onClick={() => handleViewOrder(ord.id)}
                        title="View Details"
                        className="p-1.5 text-charcoal-500 hover:text-charcoal-900 hover:bg-charcoal-100 rounded-md transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Reprint */}
                      <button
                        onClick={() => handleReprint(ord.id)}
                        title="Reprint Thermal Receipt"
                        className="p-1.5 text-primary-800 hover:text-primary-900 hover:bg-primary-50 rounded-md transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      {/* Cancel */}
                      {ord.status === 'completed' && (
                        <button
                          onClick={() => setCancelModalOrder(ord)}
                          title="Cancel / Refund Order"
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-charcoal-400 text-xs">
            <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-charcoal-300" />
            <p className="font-semibold text-charcoal-600">No Orders Found</p>
            <p className="mt-1 text-charcoal-400">Try adjusting your filters or date range.</p>
          </div>
        )}
      </div>

      {/* Order Details Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 no-print animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col border border-charcoal-200 overflow-hidden">
            <div className="p-5 border-b border-charcoal-100 flex items-center justify-between bg-surface-muted/50">
              <div>
                <h3 className="text-base font-bold text-charcoal-900">
                  Order Details: {selectedOrder.order_number}
                </h3>
                <p className="text-xs text-charcoal-500">
                  {formatDateTime(selectedOrder.created_at)} · Cashier: {selectedOrder.cashier?.full_name || 'Staff'}
                </p>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                selectedOrder.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {selectedOrder.status.toUpperCase()}
              </span>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Order Meta Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-charcoal-50 p-3 rounded-xl border border-charcoal-200/80">
                <div>
                  <span className="text-charcoal-400 text-[10px] uppercase font-bold">Order Type</span>
                  <p className="font-bold text-charcoal-800 mt-0.5">
                    {selectedOrder.order_type === 'dine_in'
                      ? `Dine-In (${selectedOrder.table_number || 'N/A'})`
                      : selectedOrder.order_type === 'online'
                      ? `Online Delivery (${selectedOrder.delivery_partner || 'Direct'})`
                      : 'Takeaway'}
                  </p>
                </div>
                <div>
                  <span className="text-charcoal-400 text-[10px] uppercase font-bold">Server / Waiter</span>
                  <p className="font-bold text-charcoal-800 mt-0.5">
                    {selectedOrder.waiter_name || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-charcoal-400 text-[10px] uppercase font-bold">Payment Method</span>
                  <p className="font-bold text-charcoal-800 mt-0.5 uppercase">
                    {selectedOrder.payment?.payment_method || 'CASH'}
                  </p>
                </div>
              </div>

              {/* Items Table Snapshot */}
              <div>
                <h4 className="font-bold text-charcoal-800 uppercase text-[11px] mb-2 tracking-wider">
                  Purchased Items Snapshot
                </h4>
                <div className="border border-charcoal-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-charcoal-50 text-charcoal-500 font-semibold text-[10px] uppercase border-b border-charcoal-200">
                      <tr>
                        <th className="p-2.5">Item Name</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Unit Rate</th>
                        <th className="p-2.5 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-charcoal-100">
                      {selectedOrder.items?.map((it) => (
                        <tr key={it.id}>
                          <td className="p-2.5 font-semibold text-charcoal-800">
                            {it.item_name}
                            <span className="block text-[10px] text-charcoal-400 font-mono">
                              {it.item_sku}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-bold">{it.quantity}</td>
                          <td className="p-2.5 text-right">{formatCurrency(it.unit_price, settings.currency_symbol)}</td>
                          <td className="p-2.5 text-right font-bold">{formatCurrency(it.line_total, settings.currency_symbol)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Breakdown */}
              <div className="bg-charcoal-50 p-3.5 rounded-xl border border-charcoal-200 space-y-1.5 font-medium">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedOrder.subtotal, settings.currency_symbol)}</span>
                </div>
                {Number(selectedOrder.discount_amount) > 0 && (
                  <div className="flex justify-between text-emerald-800">
                    <span>Discount ({selectedOrder.discount_percent}%):</span>
                    <span>-{formatCurrency(selectedOrder.discount_amount, settings.currency_symbol)}</span>
                  </div>
                )}
                {Number(selectedOrder.tax_amount) > 0 && (
                  <div className="flex justify-between">
                    <span>{selectedOrder.tax_name} ({selectedOrder.tax_rate_percent}%):</span>
                    <span>{formatCurrency(selectedOrder.tax_amount, settings.currency_symbol)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-charcoal-900 pt-1.5 border-t border-charcoal-200">
                  <span>Grand Total:</span>
                  <span className="text-primary-800">{formatCurrency(selectedOrder.total_amount, settings.currency_symbol)}</span>
                </div>
              </div>

              {selectedOrder.status === 'cancelled' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                  <span className="font-bold text-[10px] uppercase tracking-wider block">
                    Cancellation Reason:
                  </span>
                  <p className="mt-1">{selectedOrder.cancellation_reason || 'No reason specified'}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-charcoal-100 bg-surface-muted/50 flex justify-between">
              <button
                onClick={() => {
                  setReprintOrder(selectedOrder);
                  setSelectedOrder(null);
                }}
                className="px-3.5 py-2 bg-primary-800 hover:bg-primary-900 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Reprint Receipt</span>
              </button>

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-charcoal-200 hover:bg-charcoal-300 text-charcoal-800 rounded-lg text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Prompt Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 no-print animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-charcoal-200">
            <div className="flex items-center space-x-3 text-rose-700 mb-3">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-charcoal-900">
                Cancel / Refund Order?
              </h3>
            </div>

            <p className="text-xs text-charcoal-600 mb-3 leading-relaxed">
              Are you sure you want to cancel order <strong>#{cancelModalOrder.order_number}</strong>?
              This will update financial sales reports and record an audit log.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                Reason for cancellation *
              </label>
              <textarea
                rows="3"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Customer cancelled order before preparation, incorrect table entered..."
                className="w-full p-2.5 text-xs border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 text-charcoal-800"
              />
            </div>

            <div className="mt-5 flex justify-end space-x-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setCancelModalOrder(null)}
                className="px-3.5 py-2 bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-700 rounded-lg text-xs font-semibold"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelSubmit}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Preview Modal */}
      {reprintOrder && (
        <ThermalReceipt
          order={reprintOrder}
          onClose={() => setReprintOrder(null)}
        />
      )}
    </div>
  );
};

export default OrderHistory;
