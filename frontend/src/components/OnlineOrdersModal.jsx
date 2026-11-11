import React from 'react';
import { 
  Bell, 
  X, 
  Check, 
  MapPin, 
  Phone, 
  Clock, 
  Bike, 
  ShoppingBag, 
  Sparkles, 
  Printer, 
  AlertCircle 
} from 'lucide-react';
import { useOnlineOrders } from '../context/OnlineOrdersContext';
import ThermalReceipt from './ThermalReceipt';
import { formatCurrency } from '../utils/formatters';

const getPartnerBadgeStyle = (partner = '') => {
  const p = partner.toLowerCase();
  if (p.includes('swiggy')) {
    return 'bg-orange-50 text-orange-700 border-orange-200';
  }
  if (p.includes('zomato')) {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
  if (p.includes('website')) {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  return 'bg-emerald-50 text-emerald-800 border-emerald-200';
};

const OnlineOrdersModal = () => {
  const {
    pendingOrders,
    pendingCount,
    isDrawerOpen,
    setIsDrawerOpen,
    newOrderAlert,
    dismissAlert,
    acceptedOrderForPrint,
    clearPrintOrder,
    acceptOrder,
    rejectOrder,
    simulateOrder,
    loading,
  } = useOnlineOrders();

  return (
    <>
      {/* 1. Floating Top-Right Alert Banner for newly arrived online orders */}
      {newOrderAlert && (
        <div className="fixed top-20 right-6 z-50 max-w-sm w-full bg-white rounded-2xl shadow-2xl border-2 border-emerald-500 p-4 animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Bell className="w-5 h-5 animate-bounce" />
                </div>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-500 rounded-full animate-ping"></span>
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-black text-charcoal-900 tracking-tight">
                    New Online Order
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getPartnerBadgeStyle(newOrderAlert.delivery_partner)}`}>
                    {newOrderAlert.delivery_partner || 'Online'}
                  </span>
                </div>
                <p className="text-[11px] text-charcoal-500 font-mono mt-0.5">
                  #{newOrderAlert.order_number}
                </p>
              </div>
            </div>

            <button
              onClick={dismissAlert}
              className="text-charcoal-400 hover:text-charcoal-700 p-1 rounded-lg"
              title="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 bg-charcoal-50 p-2.5 rounded-xl text-xs space-y-1">
            <div className="flex items-center justify-between font-bold text-charcoal-800">
              <span>{newOrderAlert.customer_name || 'Online Customer'}</span>
              <span className="text-primary-800 font-black">{formatCurrency(newOrderAlert.total_amount)}</span>
            </div>
            <p className="text-[11px] text-charcoal-500 truncate">
              {newOrderAlert.items?.map((i) => `${i.item_name} × ${i.quantity}`).join(', ')}
            </p>
          </div>

          <div className="mt-3 flex items-center space-x-2">
            <button
              onClick={() => acceptOrder(newOrderAlert.id)}
              className="flex-1 py-2 px-3 bg-primary-800 hover:bg-primary-900 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center space-x-1.5"
            >
              <Check className="w-3.5 h-3.5 text-accent-400" />
              <span>Accept & Print</span>
            </button>
            <button
              onClick={() => {
                dismissAlert();
                setIsDrawerOpen(true);
              }}
              className="py-2 px-3 border border-charcoal-300 hover:bg-charcoal-50 text-charcoal-700 rounded-xl text-xs font-bold transition-colors"
            >
              Details
            </button>
          </div>
        </div>
      )}

      {/* 2. Full Online Orders Management Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-charcoal-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-charcoal-100 flex items-center justify-between bg-surface-muted/30">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-primary-800 text-white flex items-center justify-center shadow-xs">
                  <Bike className="w-5 h-5 text-accent-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-charcoal-900">
                      Online Delivery Orders
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-accent-100 text-accent-900 border border-accent-300">
                      {pendingCount} Pending
                    </span>
                  </div>
                  <p className="text-xs text-charcoal-500 mt-0.5">
                    Live orders received from Swiggy, Zomato, Direct Online, and Restaurant Website.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={simulateOrder}
                  className="hidden sm:flex items-center space-x-1 px-3 py-1.5 bg-accent-50 hover:bg-accent-100 text-accent-900 border border-accent-300 rounded-xl text-xs font-bold transition-colors"
                  title="Simulate a new incoming online order for testing"
                >
                  <Sparkles className="w-3.5 h-3.5 text-accent-600" />
                  <span>+ Test Order</span>
                </button>

                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-charcoal-400 hover:text-charcoal-700 p-1.5 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content / Orders List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {pendingOrders.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-charcoal-100 text-charcoal-400 flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-charcoal-800">
                      No Pending Online Orders
                    </h4>
                    <p className="text-xs text-charcoal-500 mt-1 max-w-sm mx-auto">
                      All online orders are currently billed and completed. The terminal is actively listening for new orders.
                    </p>
                  </div>
                  <button
                    onClick={simulateOrder}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-primary-800 hover:bg-primary-900 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-accent-400" />
                    <span>Simulate Incoming Online Order</span>
                  </button>
                </div>
              ) : (
                pendingOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 rounded-xl border border-charcoal-200 hover:border-primary-400 bg-white transition-all shadow-2xs space-y-3"
                  >
                    {/* Top Row: Order ID, Channel Badge & Amount */}
                    <div className="flex items-center justify-between pb-2 border-b border-charcoal-100">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs text-charcoal-900 bg-charcoal-100 px-2 py-0.5 rounded">
                          #{ord.order_number}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPartnerBadgeStyle(ord.delivery_partner)}`}>
                          {ord.delivery_partner || 'Online Delivery'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-primary-800">
                          {formatCurrency(ord.total_amount)}
                        </span>
                        <span className="text-[10px] text-charcoal-400 block font-medium">
                          {ord.payment?.payment_method?.toUpperCase() || 'UPI'} • {ord.payment?.payment_status?.toUpperCase() || 'PAID'}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Customer Info & Address */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="font-bold text-charcoal-900">{ord.customer_name || 'Guest Customer'}</p>
                        {ord.customer_phone && (
                          <p className="text-charcoal-500 text-[11px] flex items-center space-x-1 mt-0.5">
                            <Phone className="w-3 h-3 text-primary-700" />
                            <span>{ord.customer_phone}</span>
                          </p>
                        )}
                      </div>

                      {ord.delivery_address && (
                        <div className="text-[11px] text-charcoal-600 flex items-start space-x-1.5">
                          <MapPin className="w-3.5 h-3.5 text-primary-700 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{ord.delivery_address}</span>
                        </div>
                      )}
                    </div>

                    {/* Order Items List */}
                    <div className="bg-charcoal-50/70 p-2.5 rounded-lg text-xs space-y-1">
                      {ord.items?.map((item) => (
                        <div key={item.id} className="flex justify-between text-charcoal-700">
                          <span>
                            <strong className="text-charcoal-900">{item.quantity}×</strong> {item.item_name}
                          </span>
                          <span className="font-semibold text-charcoal-800">
                            {formatCurrency(item.line_total)}
                          </span>
                        </div>
                      ))}
                      {ord.notes && (
                        <p className="text-[11px] text-accent-700 pt-1 italic border-t border-charcoal-200 mt-1">
                          Note: "{ord.notes}"
                        </p>
                      )}
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="flex items-center justify-end space-x-2 pt-1">
                      <button
                        onClick={() => rejectOrder(ord.id)}
                        className="px-3 py-1.5 border border-charcoal-300 hover:bg-rose-50 hover:text-rose-700 text-charcoal-600 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => acceptOrder(ord.id)}
                        className="px-4 py-1.5 bg-primary-800 hover:bg-primary-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
                      >
                        <Check className="w-3.5 h-3.5 text-accent-400" />
                        <span>Accept & Bill</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Automatic Thermal Receipt Preview upon accepting an order */}
      {acceptedOrderForPrint && (
        <ThermalReceipt
          order={acceptedOrderForPrint}
          onClose={clearPrintOrder}
        />
      )}
    </>
  );
};

export default OnlineOrdersModal;
