import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings as SettingsIcon, 
  Save, 
  Building2, 
  Percent, 
  Receipt, 
  Printer, 
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Users
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { settings, updateSettings, loading: loadingSettings } = useSettings();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Only administrators can update restaurant settings.');
      return;
    }

    try {
      setSaving(true);
      await updateSettings(form);
      toast.success('Restaurant configuration updated successfully!');
    } catch (err) {
      toast.error('Failed to update settings. Please check field formats.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-charcoal-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-charcoal-900 tracking-tight">
            System & Billing Configuration
          </h2>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Configure restaurant identity, tax regulations, discount thresholds, and thermal printing defaults.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-1.5 px-4 py-2 bg-primary-800 hover:bg-primary-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-60"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-4 h-4 text-accent-400" />
            )}
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        )}
      </div>

      {/* Staff Accounts Quick Link Card */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-primary-900 via-primary-800 to-primary-900 rounded-2xl p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Staff & Login Accounts Management</h3>
              <p className="text-xs text-white/80 mt-0.5">
                Create new login IDs, assign cashier/admin roles, and reset passwords for POS staff.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/staff')}
            className="px-4 py-2 bg-white text-primary-900 hover:bg-charcoal-100 rounded-xl text-xs font-bold shrink-0 transition-colors shadow-xs flex items-center space-x-1.5"
          >
            <span>Manage Staff Logins</span>
            <span>&rarr;</span>
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Restaurant Business Information */}
        <div className="bg-white p-6 rounded-2xl border border-charcoal-200/80 shadow-xs">
          <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-charcoal-100">
            <Building2 className="w-5 h-5 text-primary-800" />
            <h3 className="text-sm font-bold text-charcoal-900">
              Restaurant Invoice Details
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                Restaurant Trade Name *
              </label>
              <input
                type="text"
                name="restaurant_name"
                value={form.restaurant_name || ''}
                onChange={handleChange}
                disabled={!isAdmin}
                className="w-full p-2.5 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 font-semibold text-charcoal-900"
              />
            </div>

            <div>
              <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                Tagline / Slogan
              </label>
              <input
                type="text"
                name="tagline"
                value={form.tagline || ''}
                onChange={handleChange}
                disabled={!isAdmin}
                className="w-full p-2.5 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-800"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                Full Physical Address *
              </label>
              <textarea
                rows="2"
                name="address"
                value={form.address || ''}
                onChange={handleChange}
                disabled={!isAdmin}
                className="w-full p-2.5 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-800"
              />
            </div>

            <div>
              <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                Contact Phone Number
              </label>
              <input
                type="text"
                name="phone"
                value={form.phone || ''}
                onChange={handleChange}
                disabled={!isAdmin}
                className="w-full p-2.5 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-800"
              />
            </div>

            <div>
              <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                Official Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email || ''}
                onChange={handleChange}
                disabled={!isAdmin}
                className="w-full p-2.5 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-800"
              />
            </div>

            <div>
              <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                Tax Identification / GSTIN ID
              </label>
              <input
                type="text"
                name="tax_id"
                value={form.tax_id || ''}
                onChange={handleChange}
                disabled={!isAdmin}
                placeholder="e.g. 33ABCDE1234F1Z5"
                className="w-full p-2.5 border border-charcoal-300 rounded-lg uppercase font-mono focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-900"
              />
            </div>

            <div>
              <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                name="currency_symbol"
                value={form.currency_symbol || '₹'}
                onChange={handleChange}
                disabled={!isAdmin}
                className="w-full p-2.5 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-800 font-bold"
              />
            </div>
          </div>
        </div>

        {/* 2. Tax & Discount Settings */}
        <div className="bg-white p-6 rounded-2xl border border-charcoal-200/80 shadow-xs">
          <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-charcoal-100">
            <Percent className="w-5 h-5 text-primary-800" />
            <h3 className="text-sm font-bold text-charcoal-900">
              Tax & Discount Policies
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            {/* Tax Enabled Toggle */}
            <div className="sm:col-span-2 p-3.5 bg-charcoal-50 rounded-xl border border-charcoal-200 space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="tax_enabled"
                  name="tax_enabled"
                  checked={form.tax_enabled || false}
                  onChange={handleChange}
                  disabled={!isAdmin}
                  className="rounded text-primary-800 focus:ring-primary-800 w-4 h-4"
                />
                <label htmlFor="tax_enabled" className="font-bold text-charcoal-900 cursor-pointer">
                  Enable Applicable Tax Calculation on Bills
                </label>
              </div>
              <p className="text-[11px] text-charcoal-500 pl-6">
                When enabled, calculated taxes are transparently itemized on receipts.
              </p>
            </div>

            <div>
              <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                Tax Label
              </label>
              <input
                type="text"
                name="tax_name"
                value={form.tax_name || 'GST'}
                onChange={handleChange}
                disabled={!isAdmin || !form.tax_enabled}
                placeholder="GST / VAT / Sales Tax"
                className="w-full p-2.5 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-800"
              />
            </div>

            <div>
              <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                Tax Rate Percentage (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                name="tax_rate_percent"
                value={form.tax_rate_percent || '5.00'}
                onChange={handleChange}
                disabled={!isAdmin || !form.tax_enabled}
                className="w-full p-2.5 border border-charcoal-300 rounded-lg font-bold focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-900"
              />
            </div>

            {/* Tax Pricing Method */}
            <div className="sm:col-span-2 p-3.5 bg-charcoal-50 rounded-xl border border-charcoal-200 space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_tax_inclusive"
                  name="is_tax_inclusive"
                  checked={form.is_tax_inclusive || false}
                  onChange={handleChange}
                  disabled={!isAdmin || !form.tax_enabled}
                  className="rounded text-primary-800 focus:ring-primary-800 w-4 h-4"
                />
                <label htmlFor="is_tax_inclusive" className="font-bold text-charcoal-900 cursor-pointer">
                  Tax-Inclusive Pricing (Menu prices already include taxes)
                </label>
              </div>
              <p className="text-[11px] text-charcoal-500 pl-6">
                If checked, taxable amount and tax are back-calculated from menu prices without adding extra tax onto the bill.
              </p>
            </div>

            {/* Discount permissions */}
            <div className="sm:col-span-2 p-3.5 bg-charcoal-50 rounded-xl border border-charcoal-200 space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allow_discounts"
                  name="allow_discounts"
                  checked={form.allow_discounts || false}
                  onChange={handleChange}
                  disabled={!isAdmin}
                  className="rounded text-primary-800 focus:ring-primary-800 w-4 h-4"
                />
                <label htmlFor="allow_discounts" className="font-bold text-charcoal-900 cursor-pointer">
                  Allow Cashiers to Apply Percentage Discounts
                </label>
              </div>

              <div>
                <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                  Maximum Authorized Discount Threshold (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  name="max_discount_percent"
                  value={form.max_discount_percent || '20.00'}
                  onChange={handleChange}
                  disabled={!isAdmin || !form.allow_discounts}
                  className="w-48 p-2 border border-charcoal-300 rounded-lg font-bold focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Thermal Receipt Settings */}
        <div className="bg-white p-6 rounded-2xl border border-charcoal-200/80 shadow-xs">
          <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-charcoal-100">
            <Printer className="w-5 h-5 text-primary-800" />
            <h3 className="text-sm font-bold text-charcoal-900">
              Thermal Receipt & Printer Configuration
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                Default Thermal Paper Roll Width
              </label>
              <select
                name="receipt_printer_width"
                value={form.receipt_printer_width || '80mm'}
                onChange={handleChange}
                disabled={!isAdmin}
                className="w-full p-2.5 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-800 font-semibold"
              >
                <option value="80mm">80 mm Standard Thermal Roll</option>
                <option value="58mm">58 mm Compact Thermal Roll</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                Receipt Footer Greeting Note
              </label>
              <textarea
                rows="2"
                name="receipt_footer_message"
                value={form.receipt_footer_message || ''}
                onChange={handleChange}
                disabled={!isAdmin}
                placeholder="Thank you for dining with us! Please visit again."
                className="w-full p-2.5 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-800"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Settings;
