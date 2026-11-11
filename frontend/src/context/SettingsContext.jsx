import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const SettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
  restaurant_name: "Green Spices Restaurant",
  tagline: "Authentic Dining & Flavors",
  address: "Plot 42, Marina Road, Food District, Chennai",
  phone: "+91 98765 43210",
  email: "billing@greenspices.com",
  tax_id: "33ABCDE1234F1Z5",
  currency_symbol: "₹",
  tax_enabled: true,
  tax_name: "GST",
  tax_rate_percent: "5.00",
  is_tax_inclusive: false,
  allow_discounts: true,
  max_discount_percent: "20.00",
  receipt_footer_message: "Thank you for dining with us! Please visit again.",
  receipt_printer_width: "80mm",
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get('/settings/');
      setSettings(res.data);
    } catch (err) {
      console.warn('Could not load settings from backend, using defaults:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('pos_token');
    if (token) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [fetchSettings]);

  const updateSettings = async (newSettings) => {
    const res = await api.put('/settings/', newSettings);
    setSettings(res.data);
    return res.data;
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
