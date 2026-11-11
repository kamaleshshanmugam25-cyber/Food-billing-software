import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { playOrderChime } from '../utils/sound';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

const OnlineOrdersContext = createContext(null);

export const OnlineOrdersProvider = ({ children }) => {
  const { user } = useAuth();
  const toast = useToast();

  const [pendingOrders, setPendingOrders] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const [acceptedOrderForPrint, setAcceptedOrderForPrint] = useState(null);
  const [loading, setLoading] = useState(false);

  // Keep track of order IDs already alerted so chime only plays for NEW incoming orders
  const seenOrderIdsRef = useRef(new Set());
  const initialLoadRef = useRef(true);

  // Fetch pending online orders from API
  const fetchPendingOrders = useCallback(async (isPolling = false) => {
    if (!user) return;
    try {
      if (!isPolling) setLoading(true);
      const res = await api.get('/orders/pending-online/');
      const orders = res.data.orders || [];
      setPendingOrders(orders);

      // Check if there are newly arrived orders
      const currentSeen = seenOrderIdsRef.current;
      const newIncoming = [];

      orders.forEach((ord) => {
        if (!currentSeen.has(ord.id)) {
          currentSeen.add(ord.id);
          if (!initialLoadRef.current) {
            newIncoming.push(ord);
          }
        }
      });

      if (initialLoadRef.current) {
        initialLoadRef.current = false;
      } else if (newIncoming.length > 0) {
        // Trigger audible chime and notification popup for the newest order
        playOrderChime();
        const latest = newIncoming[0];
        setNewOrderAlert(latest);
        toast.info(`🔔 New Online Order #${latest.order_number} (${latest.delivery_partner || 'Online'}) received!`);
      }
    } catch (err) {
      console.warn('Failed to poll online orders:', err);
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [user, toast]);

  // Periodic polling every 8 seconds when user is signed in
  useEffect(() => {
    if (!user) return;
    fetchPendingOrders(false);

    const interval = setInterval(() => {
      fetchPendingOrders(true);
    }, 8000);

    return () => clearInterval(interval);
  }, [user, fetchPendingOrders]);

  // Accept a pending online order (completes billing)
  const acceptOrder = async (orderId) => {
    try {
      const res = await api.post(`/orders/${orderId}/accept/`);
      toast.success(res.data.message || 'Online order accepted and billed!');
      setAcceptedOrderForPrint(res.data.order);
      setNewOrderAlert(null);
      await fetchPendingOrders();
      return res.data.order;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to accept order.');
      return null;
    }
  };

  // Reject / Cancel a pending online order
  const rejectOrder = async (orderId, reason = 'Customer cancelled / Kitchen busy') => {
    try {
      await api.post(`/orders/${orderId}/cancel/`, { reason });
      toast.info('Online order rejected.');
      if (newOrderAlert?.id === orderId) setNewOrderAlert(null);
      await fetchPendingOrders();
    } catch (err) {
      toast.error('Failed to cancel order.');
    }
  };

  // Simulate an incoming online order (1-click test for staff)
  const simulateOrder = async () => {
    try {
      const res = await api.post('/orders/simulate-online/');
      toast.success(`Simulated order #${res.data.order_number} placed!`);
      await fetchPendingOrders();
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to simulate online order.');
      return null;
    }
  };

  const dismissAlert = () => {
    setNewOrderAlert(null);
  };

  const clearPrintOrder = () => {
    setAcceptedOrderForPrint(null);
  };

  return (
    <OnlineOrdersContext.Provider
      value={{
        pendingOrders,
        pendingCount: pendingOrders.length,
        isDrawerOpen,
        setIsDrawerOpen,
        newOrderAlert,
        dismissAlert,
        acceptedOrderForPrint,
        clearPrintOrder,
        loading,
        fetchPendingOrders,
        acceptOrder,
        rejectOrder,
        simulateOrder,
      }}
    >
      {children}
    </OnlineOrdersContext.Provider>
  );
};

export const useOnlineOrders = () => {
  const context = useContext(OnlineOrdersContext);
  if (!context) {
    throw new Error('useOnlineOrders must be used within an OnlineOrdersProvider');
  }
  return context;
};
