import React, { useState } from 'react';
import { Printer, X, Check, Eye } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { useSettings } from '../context/SettingsContext';

const ThermalReceipt = ({ order, onClose }) => {
  const { settings } = useSettings();
  const [paperWidth, setPaperWidth] = useState(settings.receipt_printer_width || '80mm'); // '80mm' or '58mm'

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const is58mm = paperWidth === '58mm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto no-print animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full flex flex-col max-h-[92vh] border border-charcoal-200">
        {/* Header Controls (Hidden during actual print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-100 bg-surface-muted rounded-t-xl">
          <div>
            <h3 className="text-base font-semibold text-charcoal-800">Print Receipt Preview</h3>
            <p className="text-xs text-charcoal-500">Order #{order.order_number}</p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Paper Width Switcher */}
            <div className="flex bg-charcoal-200/80 p-0.5 rounded-lg text-xs font-medium text-charcoal-600">
              <button
                onClick={() => setPaperWidth('80mm')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  paperWidth === '80mm'
                    ? 'bg-white text-primary-800 shadow-xs font-semibold'
                    : 'hover:text-charcoal-900'
                }`}
              >
                80 mm
              </button>
              <button
                onClick={() => setPaperWidth('58mm')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  paperWidth === '58mm'
                    ? 'bg-white text-primary-800 shadow-xs font-semibold'
                    : 'hover:text-charcoal-900'
                }`}
              >
                58 mm
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2 bg-primary-800 hover:bg-primary-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-charcoal-400 hover:text-charcoal-700 hover:bg-charcoal-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Preview Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-charcoal-100/50 flex justify-center">
          {/* Thermal Receipt Paper Card */}
          <div
            id="printable-receipt"
            style={{ width: is58mm ? '58mm' : '80mm' }}
            className="bg-white p-4 shadow-md text-black font-mono text-xs leading-tight transition-all duration-200 border border-charcoal-200"
          >
            {/* Restaurant Header */}
            <div className="text-center mb-3">
              <h2 className="text-sm font-bold tracking-tight uppercase">
                {settings.restaurant_name || "Green Spices Restaurant"}
              </h2>
              {settings.tagline && (
                <p className="text-[10px] text-gray-700 font-sans italic">{settings.tagline}</p>
              )}
              <p className="text-[10px] mt-1 text-gray-800 font-sans">{settings.address}</p>
              <p className="text-[10px] text-gray-800 font-sans">Ph: {settings.phone}</p>
              {settings.tax_id && (
                <p className="text-[10px] font-semibold mt-0.5 font-sans">
                  {settings.tax_name} / GSTIN: {settings.tax_id}
                </p>
              )}
            </div>

            {/* Receipt Meta Divider */}
            <div className="border-t border-b border-dashed border-gray-400 py-1.5 my-2 space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span>Bill No:</span>
                <span className="font-bold">{order.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{formatDateTime(order.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span>Type:</span>
                <span className="font-bold uppercase">
                  {order.order_type === 'dine_in' 
                    ? `Dine-In (${order.table_number || 'Table'})` 
                    : order.order_type === 'online'
                    ? `Online (${order.delivery_partner || 'Delivery'})`
                    : 'Takeaway'}
                </span>
              </div>
              {order.customer_name && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{order.customer_name}</span>
                </div>
              )}
              {order.customer_phone && (
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span>{order.customer_phone}</span>
                </div>
              )}
              {order.delivery_address && (
                <div className="flex justify-between">
                  <span>Delivery Address:</span>
                  <span className="text-right text-[10px] max-w-[60%] font-medium">{order.delivery_address}</span>
                </div>
              )}
              {order.waiter_name && (
                <div className="flex justify-between">
                  <span>Server / Waiter:</span>
                  <span className="font-semibold">{order.waiter_name}</span>
                </div>
              )}
              {order.cashier && (
                <div className="flex justify-between">
                  <span>Cashier:</span>
                  <span>{order.cashier.first_name || order.cashier.username}</span>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="my-2">
              <div className="flex justify-between border-b border-gray-400 pb-1 font-bold text-[11px]">
                <span className="w-1/2 text-left">ITEM</span>
                <span className="w-1/6 text-center">QTY</span>
                <span className="w-1/6 text-right">RATE</span>
                <span className="w-1/6 text-right">AMT</span>
              </div>

              <div className="divide-y divide-gray-100">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="py-1 flex justify-between items-start text-[11px]">
                    <div className="w-1/2 text-left pr-1 truncate font-sans">
                      {item.item_name}
                    </div>
                    <div className="w-1/6 text-center">{item.quantity}</div>
                    <div className="w-1/6 text-right">{Number(item.unit_price).toFixed(2)}</div>
                    <div className="w-1/6 text-right font-medium">{Number(item.line_total).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals & Tax Breakdown */}
            <div className="border-t border-dashed border-gray-400 pt-2 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal ({order.item_count} items):</span>
                <span>{formatCurrency(order.subtotal, settings.currency_symbol)}</span>
              </div>

              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-gray-800">
                  <span>Discount ({order.discount_percent}%):</span>
                  <span>-{formatCurrency(order.discount_amount, settings.currency_symbol)}</span>
                </div>
              )}

              {Number(order.tax_amount) > 0 && (
                <div className="flex justify-between">
                  <span>
                    {order.tax_name} ({order.tax_rate_percent}%)
                    {order.is_tax_inclusive ? ' [Incl]' : ''}:
                  </span>
                  <span>{formatCurrency(order.tax_amount, settings.currency_symbol)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-extrabold border-t border-b border-black py-1 mt-1">
                <span>GRAND TOTAL:</span>
                <span>{formatCurrency(order.total_amount, settings.currency_symbol)}</span>
              </div>
            </div>

            {/* Payment Info */}
            <div className="mt-2 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>Payment Mode:</span>
                <span className="font-bold uppercase">
                  {order.payment?.payment_method || 'CASH'}
                </span>
              </div>

              {order.payment?.payment_method === 'cash' && (
                <>
                  <div className="flex justify-between">
                    <span>Cash Tendered:</span>
                    <span>{formatCurrency(order.payment?.amount_received, settings.currency_symbol)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Change Returned:</span>
                    <span>{formatCurrency(order.payment?.change_due, settings.currency_symbol)}</span>
                  </div>
                </>
              )}

              {order.payment?.reference_note && (
                <div className="flex justify-between text-[9px] text-gray-600">
                  <span>Reference:</span>
                  <span>{order.payment.reference_note}</span>
                </div>
              )}
            </div>

            {/* Footer Message */}
            <div className="mt-4 pt-2 border-t border-dashed border-gray-400 text-center text-[10px] text-gray-700">
              <p>{settings.receipt_footer_message || "Thank you for dining with us! Please visit again."}</p>
              <p className="mt-1 text-[8px] text-gray-500 font-sans">
                Powered by Restaurant POS v1.0
              </p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Close */}
        <div className="px-6 py-3 border-t border-charcoal-100 bg-surface-muted flex justify-end rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-charcoal-200 hover:bg-charcoal-300 text-charcoal-800 rounded-lg text-xs font-medium transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThermalReceipt;
