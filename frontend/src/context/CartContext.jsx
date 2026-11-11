import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import api from '../services/api';
import { useSettings } from './SettingsContext';
import { useToast } from './ToastContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { settings } = useSettings();
  const toast = useToast();

  const [cartItems, setCartItems] = useState([]);
  const [orderType, setOrderType] = useState('dine_in'); // 'dine_in' | 'takeaway' | 'online'
  const [tableNumber, setTableNumber] = useState('Table 1');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [waiterId, setWaiterId] = useState(null);
  const [waiterName, setWaiterName] = useState('');
  const [deliveryPartner, setDeliveryPartner] = useState('Direct'); // 'Direct' | 'Swiggy' | 'Zomato' | 'Website'
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'upi' | 'card' | 'other'
  const [amountReceived, setAmountReceived] = useState('');
  const [referenceNote, setReferenceNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState(null);

  // Add Item
  const addItem = useCallback((item) => {
    if (!item.is_available) {
      toast.warning(`'${item.name}' is currently marked out of stock.`);
      return;
    }

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.id === item.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + 1;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          line_total: (Number(item.price) * newQty).toFixed(2),
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            id: item.id,
            sku: item.sku,
            name: item.name,
            image_url: item.image_url || '',
            category_name: item.category_name || '',
            price: Number(item.price),
            quantity: 1,
            line_total: Number(item.price).toFixed(2),
          },
        ];
      }
    });
  }, [toast]);

  // Remove Item
  const removeItem = useCallback((itemId) => {
    setCartItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  // Update Quantity with delta (+1 / -1)
  const updateQuantity = useCallback((itemId, delta) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.id === itemId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            return {
              ...item,
              quantity: nextQty,
              line_total: (item.price * nextQty).toFixed(2),
            };
          }
          return item;
        })
        .filter(Boolean);
    });
  }, []);

  // Clear Cart
  const clearCart = useCallback(() => {
    setCartItems([]);
    setDiscountPercent(0);
    setAmountReceived('');
    setReferenceNote('');
    setNotes('');
    setDeliveryAddress('');
    setCustomerName('');
    setCustomerPhone('');
  }, []);

  // Live Decimal Financial Calculations
  const financials = useMemo(() => {
    const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const validDiscountPct = Math.min(
      Math.max(0, Number(discountPercent) || 0),
      Number(settings.max_discount_percent) || 20
    );
    const discountAmount = Math.round((subtotal * (validDiscountPct / 100)) * 100) / 100;
    const amountAfterDiscount = subtotal - discountAmount;

    const taxRate = settings.tax_enabled ? Number(settings.tax_rate_percent) || 0 : 0;
    let taxableAmount = 0;
    let taxAmount = 0;
    let totalAmount = 0;

    if (!settings.tax_enabled || taxRate === 0) {
      taxableAmount = amountAfterDiscount;
      taxAmount = 0;
      totalAmount = amountAfterDiscount;
    } else if (settings.is_tax_inclusive) {
      taxableAmount = Math.round((amountAfterDiscount / (1 + taxRate / 100)) * 100) / 100;
      taxAmount = Math.round((amountAfterDiscount - taxableAmount) * 100) / 100;
      totalAmount = amountAfterDiscount;
    } else {
      taxableAmount = amountAfterDiscount;
      taxAmount = Math.round((taxableAmount * (taxRate / 100)) * 100) / 100;
      totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;
    }

    const recAmount = Number(amountReceived) || 0;
    const changeDue = paymentMethod === 'cash' && recAmount >= totalAmount
      ? Math.round((recAmount - totalAmount) * 100) / 100
      : 0;

    return {
      subtotal: subtotal.toFixed(2),
      discountPercent: validDiscountPct,
      discountAmount: discountAmount.toFixed(2),
      taxableAmount: taxableAmount.toFixed(2),
      taxName: settings.tax_enabled ? settings.tax_name : 'Tax',
      taxRatePercent: taxRate.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      isTaxInclusive: settings.is_tax_inclusive,
      totalAmount: totalAmount.toFixed(2),
      changeDue: changeDue.toFixed(2),
      itemCount: cartItems.reduce((acc, i) => acc + i.quantity, 0),
    };
  }, [cartItems, discountPercent, settings, paymentMethod, amountReceived]);

  // Submit Order to Backend
  const submitOrder = async () => {
    if (cartItems.length === 0) {
      toast.warning('Cart is empty. Please add items to create a bill.');
      return null;
    }

    if (orderType === 'dine_in' && !tableNumber.trim()) {
      toast.warning('Please specify a Table Number for dine-in orders.');
      return null;
    }

    const total = Number(financials.totalAmount);
    if (paymentMethod === 'cash') {
      const rec = amountReceived === '' ? total : Number(amountReceived);
      if (rec < total) {
        toast.error(`Cash received (${rec.toFixed(2)}) is less than total payable (${total.toFixed(2)}).`);
        return null;
      }
    }

    setIsSubmitting(true);
    // Generate unique client idempotency token
    const clientOrderToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const payload = {
        order_type: orderType,
        table_number: orderType === 'dine_in' ? tableNumber.trim() : '',
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        waiter_id: orderType === 'dine_in' ? waiterId : null,
        waiter_name: orderType === 'dine_in' ? waiterName.trim() : '',
        delivery_partner: orderType === 'online' ? deliveryPartner.trim() : '',
        delivery_address: orderType === 'online' ? deliveryAddress.trim() : '',
        notes: notes.trim(),
        items: cartItems.map((item) => ({
          food_item_id: item.id,
          quantity: item.quantity,
        })),
        discount_percent: financials.discountPercent.toFixed(2),
        payment_method: paymentMethod,
        amount_received: paymentMethod === 'cash' ? (amountReceived || financials.totalAmount) : financials.totalAmount,
        reference_note: referenceNote.trim(),
        client_order_token: clientOrderToken,
      };

      const res = await api.post('/orders/', payload);
      const createdOrder = res.data;
      
      setLastCompletedOrder(createdOrder);
      clearCart();
      toast.success(`Order ${createdOrder.order_number} created successfully!`);
      return createdOrder;
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to place order.';
      toast.error(errMsg);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        orderType,
        setOrderType,
        tableNumber,
        setTableNumber,
        customerName,
        setCustomerName,
        customerPhone,
        setCustomerPhone,
        waiterId,
        setWaiterId,
        waiterName,
        setWaiterName,
        deliveryPartner,
        setDeliveryPartner,
        deliveryAddress,
        setDeliveryAddress,
        notes,
        setNotes,
        discountPercent,
        setDiscountPercent,
        paymentMethod,
        setPaymentMethod,
        amountReceived,
        setAmountReceived,
        referenceNote,
        setReferenceNote,
        financials,
        isSubmitting,
        lastCompletedOrder,
        setLastCompletedOrder,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        submitOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
