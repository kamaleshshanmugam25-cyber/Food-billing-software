import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  UtensilsCrossed, 
  Receipt, 
  Printer, 
  IndianRupee,
  Layers,
  CreditCard,
  QrCode,
  Banknote,
  RotateCcw,
  Check,
  X,
  ShoppingBag,
  LayoutGrid
} from 'lucide-react';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/formatters';
import ThermalReceipt from '../components/ThermalReceipt';
import TablesManagement from './TablesManagement';

const TABLE_PRESETS = [
  'Table 1', 'Table 2', 'Table 3', 'Table 4', 
  'Table 5', 'Table 6', 'Table 7', 'Table 8', 
  'AC Table 1', 'AC Table 2', 'Family 1'
];

const PosScreen = () => {
  const { settings } = useSettings();
  const toast = useToast();
  const {
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
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    submitOrder,
  } = useCart();

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Tables and Assigned Staff for Dine-In
  const [tablesList, setTablesList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [showTableModal, setShowTableModal] = useState(false);

  // Fetch Tables & Staff
  useEffect(() => {
    const fetchTablesAndStaff = async () => {
      try {
        const [tRes, sRes] = await Promise.all([
          api.get('/orders/tables/'),
          api.get('/auth/staff/'),
        ]);
        setTablesList(tRes.data);
        setStaffList(sRes.data);
        if (tRes.data.length > 0 && (!tableNumber || tableNumber === 'Table 1')) {
          const first = tRes.data[0];
          setTableNumber(first.table_number);
          if (first.assigned_staff) {
            setWaiterId(first.assigned_staff);
            setWaiterName(first.assigned_staff_name || '');
          }
        }
      } catch (err) {
        console.warn('Failed to fetch tables/staff in POS:', err);
      }
    };
    fetchTablesAndStaff();
  }, [setTableNumber, setWaiterId, setWaiterName]);

  const handleTableChange = (tNum) => {
    setTableNumber(tNum);
    const found = tablesList.find((t) => t.table_number === tNum);
    if (found && found.assigned_staff) {
      setWaiterId(found.assigned_staff);
      setWaiterName(found.assigned_staff_name || '');
    }
  };

  const handleSelectTableFromModal = (table) => {
    setTableNumber(table.table_number);
    if (table.assigned_staff) {
      setWaiterId(table.assigned_staff);
      setWaiterName(table.assigned_staff_name || '');
    } else {
      setWaiterId(null);
      setWaiterName('');
    }
    setShowTableModal(false);
  };

  // Fetch Categories & Menu Items
  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        setLoadingMenu(true);
        const [catRes, itemRes] = await Promise.all([
          api.get('/menu/categories/?active_only=true'),
          api.get('/menu/items/?active_category=true'),
        ]);
        setCategories(catRes.data);
        setItems(itemRes.data);
      } catch (err) {
        toast.error('Failed to load menu items from backend.');
      } finally {
        setLoadingMenu(false);
      }
    };

    fetchMenuData();
  }, [toast]);

  // Filtered Food Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        selectedCategory === 'ALL' || item.category === Number(selectedCategory);
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  // Map of cart quantities for quick item card counter
  const cartItemQuantities = useMemo(() => {
    const map = {};
    cartItems.forEach((ci) => {
      map[ci.id] = ci.quantity;
    });
    return map;
  }, [cartItems]);

  // Handle Checkout & Show Receipt
  const handleCheckout = async () => {
    const order = await submitOrder();
    if (order) {
      setShowReceiptModal(true);
    }
  };

  // Quick cash tender helper
  const handleQuickCash = (amt) => {
    setAmountReceived(amt.toString());
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col lg:flex-row gap-4 -m-6 p-5 overflow-hidden select-none">
      {/* ========================================================= */}
      {/* LEFT SECTION: Category Navigation & Filtering */}
      {/* ========================================================= */}
      <div className="w-full lg:w-52 bg-white rounded-2xl border border-charcoal-200 shadow-xs flex flex-col p-3.5 flex-shrink-0 overflow-hidden">
        <div className="flex items-center justify-between pb-2.5 border-b border-charcoal-100 mb-2.5">
          <div className="flex items-center space-x-1.5 text-charcoal-900 font-bold text-xs uppercase tracking-wider">
            <Layers className="w-4 h-4 text-primary-800" />
            <span>Categories</span>
          </div>
          <span className="text-[10px] font-bold text-charcoal-600 bg-charcoal-100 px-2 py-0.5 rounded-full">
            {categories.length + 1}
          </span>
        </div>

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-primary-800 text-white shadow-xs font-bold'
                : 'text-charcoal-700 hover:bg-charcoal-100 hover:text-charcoal-900'
            }`}
          >
            <span>All Items</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                selectedCategory === 'ALL'
                  ? 'bg-primary-900 text-accent-300'
                  : 'bg-charcoal-100 text-charcoal-600'
              }`}
            >
              {items.length}
            </span>
          </button>

          {categories.map((cat) => {
            const count = items.filter((i) => i.category === cat.id).length;
            const isSelected = selectedCategory === cat.id.toString();

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id.toString())}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-primary-800 text-white shadow-xs font-bold'
                    : 'text-charcoal-700 hover:bg-charcoal-100 hover:text-charcoal-900'
                }`}
              >
                <span className="truncate pr-1">{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold flex-shrink-0 ${
                    isSelected
                      ? 'bg-primary-900 text-accent-300'
                      : 'bg-charcoal-100 text-charcoal-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* CENTER SECTION: Food Item Grid with Photos */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-charcoal-200 shadow-xs overflow-hidden">
        {/* Search Header */}
        <div className="px-4 py-2.5 border-b border-charcoal-100 flex items-center justify-between gap-3 bg-surface-muted/40">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes by name or code..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-900 placeholder-charcoal-400 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-charcoal-500 font-medium hidden sm:flex items-center space-x-1">
            <span>Dishes:</span>
            <span className="font-extrabold text-charcoal-900 bg-charcoal-100 px-1.5 py-0.2 rounded">
              {filteredItems.length}
            </span>
          </div>
        </div>

        {/* Grid of Food Items with Photos */}
        <div className="flex-1 overflow-y-auto p-3.5 bg-charcoal-50/40">
          {loadingMenu ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-800 rounded-full animate-spin"></div>
              <p className="mt-2 text-xs font-semibold text-charcoal-500">Loading Food Items...</p>
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredItems.map((item) => {
                const inCartQty = cartItemQuantities[item.id] || 0;
                const isOutOfStock = !item.is_available;

                return (
                  <div
                    key={item.id}
                    onClick={() => !isOutOfStock && addItem(item)}
                    className={`group bg-white rounded-xl border transition-all duration-150 flex flex-col justify-between overflow-hidden cursor-pointer ${
                      isOutOfStock
                        ? 'opacity-60 bg-charcoal-50 border-charcoal-200 cursor-not-allowed'
                        : inCartQty > 0
                        ? 'border-primary-600 ring-2 ring-primary-600/20 shadow-xs'
                        : 'border-charcoal-200 hover:border-primary-600 hover:shadow-subtle'
                    }`}
                  >
                    {/* Food Photo */}
                    <div className="relative w-full h-24 bg-charcoal-100 overflow-hidden">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}

                      {/* Fallback */}
                      <div className={`w-full h-full flex flex-col items-center justify-center bg-charcoal-100 text-charcoal-400 ${item.image_url ? 'hidden' : ''}`}>
                        <UtensilsCrossed className="w-6 h-6 opacity-40 text-charcoal-500" />
                      </div>

                      {/* Top Badges */}
                      <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                        <span className="bg-charcoal-900/80 backdrop-blur-xs text-white text-[9px] font-mono font-bold px-1.5 py-0.2 rounded shadow-2xs">
                          {item.sku}
                        </span>

                        {inCartQty > 0 && (
                          <span className="bg-primary-800 text-accent-300 text-[9px] font-extrabold px-2 py-0.2 rounded-full shadow-xs flex items-center space-x-0.5">
                            <Check className="w-2.5 h-2.5 text-accent-400" />
                            <span>{inCartQty} in cart</span>
                          </span>
                        )}

                        {isOutOfStock && (
                          <span className="bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow-xs">
                            Sold Out
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Food Details */}
                    <div className="p-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-semibold text-charcoal-400 uppercase tracking-wider block">
                          {item.category_name}
                        </span>
                        <h4 className="text-xs font-bold text-charcoal-900 leading-tight line-clamp-1 mt-0.5" title={item.name}>
                          {item.name}
                        </h4>
                      </div>

                      {/* Price & Stepper Button */}
                      <div className="flex items-center justify-between pt-2 mt-1.5 border-t border-charcoal-100">
                        <span className="text-xs font-extrabold text-primary-800">
                          {formatCurrency(item.price, settings.currency_symbol)}
                        </span>

                        {/* Interactive Quantity Stepper if in cart */}
                        {inCartQty > 0 ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center space-x-1 bg-charcoal-100 p-0.5 rounded-lg border border-charcoal-200"
                          >
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, -1)}
                              title="Decrease"
                              className="w-5 h-5 rounded bg-white hover:bg-rose-50 hover:text-rose-600 text-charcoal-700 flex items-center justify-center font-bold text-xs transition-colors shadow-2xs"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="w-5 text-center font-extrabold text-xs text-charcoal-900">
                              {inCartQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, 1)}
                              title="Increase"
                              className="w-5 h-5 rounded bg-primary-800 hover:bg-primary-900 text-white flex items-center justify-center font-bold text-xs transition-colors shadow-2xs"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isOutOfStock) addItem(item);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-all ${
                              isOutOfStock
                                ? 'bg-charcoal-200 text-charcoal-400 cursor-not-allowed'
                                : 'bg-primary-800 hover:bg-primary-900 text-white shadow-2xs'
                            }`}
                          >
                            <Plus className="w-3 h-3 text-accent-400" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-charcoal-400">
              <UtensilsCrossed className="w-10 h-10 mb-2 text-charcoal-300" />
              <p className="text-sm font-bold text-charcoal-700">No Food Items Found</p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT SECTION: Cart, Order Config & Billing */}
      {/* ========================================================= */}
      <div className="w-full lg:w-96 bg-white rounded-2xl border border-charcoal-200 shadow-xs flex flex-col flex-shrink-0 overflow-hidden">
        {/* Cart Top Header */}
        <div className="px-3.5 py-2.5 border-b border-charcoal-100 flex items-center justify-between bg-surface-muted/50">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-md bg-primary-800 text-white flex items-center justify-center shadow-2xs">
              <ShoppingBag className="w-3 h-3 text-accent-400" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-charcoal-900 uppercase tracking-wider leading-none">
                Current Order
              </h3>
              <span className="text-[10px] text-charcoal-500 font-semibold">
                {financials.itemCount} {financials.itemCount === 1 ? 'dish' : 'dishes'}
              </span>
            </div>
          </div>

          {cartItems.length > 0 && (
            <button
              onClick={clearCart}
              title="Clear entire cart"
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center space-x-1 px-2 py-0.5 rounded-md hover:bg-rose-50 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Compact Order Type & Table Bar */}
        <div className="px-3 py-2 border-b border-charcoal-100 bg-surface-muted/30 flex items-center justify-between gap-2">
          <div className="flex bg-charcoal-100 p-0.5 rounded-lg text-xs font-bold">
            <button
              type="button"
              onClick={() => setOrderType('dine_in')}
              className={`px-2 py-1 rounded-md transition-all ${
                orderType === 'dine_in'
                  ? 'bg-primary-800 text-white shadow-2xs'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              Dine-In
            </button>
            <button
              type="button"
              onClick={() => setOrderType('takeaway')}
              className={`px-2 py-1 rounded-md transition-all ${
                orderType === 'takeaway'
                  ? 'bg-primary-800 text-white shadow-2xs'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              Takeaway
            </button>
            <button
              type="button"
              onClick={() => setOrderType('online')}
              className={`px-2 py-1 rounded-md transition-all ${
                orderType === 'online'
                  ? 'bg-primary-800 text-white shadow-2xs'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              Online
            </button>
          </div>

          {orderType === 'dine_in' ? (
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-bold text-charcoal-400 uppercase">Table:</span>
              <select
                value={tableNumber}
                onChange={(e) => handleTableChange(e.target.value)}
                className="px-2 py-0.5 text-xs border border-charcoal-300 rounded-md font-bold text-charcoal-900 bg-white focus:outline-none focus:ring-1 focus:ring-primary-800"
              >
                {tablesList.length > 0 ? (
                  tablesList.map((t) => (
                    <option key={t.id} value={t.table_number}>
                      {t.table_number} {t.assigned_staff_name && t.assigned_staff_name !== 'Unassigned' ? `(${t.assigned_staff_name})` : ''}
                    </option>
                  ))
                ) : (
                  TABLE_PRESETS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))
                )}
              </select>

              {/* Waiter Selection */}
              <select
                value={waiterId || ''}
                onChange={(e) => {
                  const sId = e.target.value ? Number(e.target.value) : null;
                  setWaiterId(sId);
                  const st = staffList.find((s) => s.id === sId);
                  setWaiterName(st ? (st.full_name || st.username) : '');
                }}
                className="w-24 px-1.5 py-0.5 text-[11px] border border-charcoal-300 rounded-md text-charcoal-700 bg-white focus:outline-none truncate"
                title="Assigned Waiter / Server"
              >
                <option value="">No Waiter</option>
                {staffList.map((st) => (
                  <option key={st.id} value={st.id}>
                    👤 {st.full_name || st.username}
                  </option>
                ))}
              </select>

              {/* Button to open visual Table Floor Plan */}
              <button
                type="button"
                onClick={() => setShowTableModal(true)}
                className="p-1 text-charcoal-500 hover:text-primary-800 hover:bg-charcoal-100 rounded-md transition-colors"
                title="View All Tables & Floor Plan"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : orderType === 'online' ? (
            <div className="flex items-center space-x-1">
              <select
                value={deliveryPartner}
                onChange={(e) => setDeliveryPartner(e.target.value)}
                className="px-1.5 py-0.5 text-[11px] border border-charcoal-300 rounded-md font-bold text-charcoal-900 bg-white focus:outline-none"
              >
                <option value="Direct">Direct</option>
                <option value="Swiggy">Swiggy</option>
                <option value="Zomato">Zomato</option>
                <option value="Website">Website</option>
              </select>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Delivery Address"
                className="w-28 px-1.5 py-0.5 text-[11px] border border-charcoal-300 rounded-md text-charcoal-900 placeholder-charcoal-400 focus:outline-none"
              />
            </div>
          ) : (
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer Name (Opt)"
              className="w-36 px-2 py-0.5 text-xs border border-charcoal-300 rounded-md text-charcoal-900 placeholder-charcoal-400 focus:outline-none"
            />
          )}
        </div>

        {/* Selected Items Scrollable List - CLEARLY SHOWS DISH NAME, PRICE & DECREASE CONTROLS */}
        <div className="flex-1 min-h-[160px] overflow-y-auto p-2.5 space-y-2 bg-charcoal-50/50">
          {cartItems.length > 0 ? (
            cartItems.map((item) => (
              <div
                key={item.id}
                className="bg-white p-2.5 rounded-xl border border-charcoal-200 shadow-2xs hover:border-charcoal-300 transition-all flex items-center justify-between gap-2"
              >
                {/* Food Thumbnail */}
                <div className="w-10 h-10 rounded-lg bg-charcoal-100 overflow-hidden flex-shrink-0 border border-charcoal-200">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-charcoal-400">
                      <UtensilsCrossed className="w-4 h-4 opacity-40" />
                    </div>
                  )}
                </div>

                {/* Food Name & Unit Rate */}
                <div className="flex-1 min-w-0 pr-1">
                  <h4 className="font-bold text-xs text-charcoal-900 leading-tight truncate" title={item.name}>
                    {item.name}
                  </h4>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="text-[10px] text-charcoal-500 font-medium">
                      {formatCurrency(item.price, settings.currency_symbol)} each
                    </span>
                  </div>
                </div>

                {/* Decrease (-) and Increase (+) Buttons */}
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, -1)}
                    title="Decrease Quantity"
                    className="w-6 h-6 rounded-md bg-charcoal-100 hover:bg-rose-100 hover:text-rose-700 text-charcoal-800 flex items-center justify-center font-bold text-xs transition-colors border border-charcoal-200 shadow-2xs"
                  >
                    <Minus className="w-3 h-3" />
                  </button>

                  <span className="w-6 text-center font-extrabold text-charcoal-900 text-xs">
                    {item.quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, 1)}
                    title="Increase Quantity"
                    className="w-6 h-6 rounded-md bg-primary-800 hover:bg-primary-900 text-white flex items-center justify-center font-bold text-xs transition-colors shadow-2xs"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Line Total & Remove Trash */}
                <div className="text-right flex-shrink-0 pl-1 w-16">
                  <span className="font-extrabold text-xs text-charcoal-900 block leading-tight">
                    {formatCurrency(item.line_total, settings.currency_symbol)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    title="Remove item"
                    className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4 text-charcoal-400">
              <div className="w-10 h-10 rounded-xl bg-charcoal-100 flex items-center justify-center mb-1.5">
                <Receipt className="w-5 h-5 text-charcoal-400" />
              </div>
              <p className="font-bold text-xs text-charcoal-700">Order is Empty</p>
              <p className="text-[10px] mt-0.5 text-charcoal-400">
                Click dishes from the menu to add to bill.
              </p>
            </div>
          )}
        </div>

        {/* Bill Calculations & Payment Options Box - COMPACT, NEVER CUT OFF */}
        <div className="p-3 border-t border-charcoal-200 bg-white space-y-2 text-xs shadow-md">
          {/* Subtotal, Discount & Tax in compact rows */}
          <div className="space-y-1 text-charcoal-600 font-medium text-[11px]">
            <div className="flex justify-between">
              <span>Subtotal ({financials.itemCount} items)</span>
              <span className="font-bold text-charcoal-900">{formatCurrency(financials.subtotal, settings.currency_symbol)}</span>
            </div>

            {settings.allow_discounts && (
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-1">
                  <span>Discount</span>
                  <input
                    type="number"
                    min="0"
                    max={settings.max_discount_percent}
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    className="w-8 px-1 py-0.2 border border-charcoal-300 rounded text-right text-[11px] font-bold"
                  />
                  <span>%</span>
                </div>
                <span className="text-emerald-700 font-bold">-{formatCurrency(financials.discountAmount, settings.currency_symbol)}</span>
              </div>
            )}

            {settings.tax_enabled && (
              <div className="flex justify-between">
                <span>{financials.taxName} ({financials.taxRatePercent}%){financials.isTaxInclusive ? ' [Incl]' : ''}</span>
                <span className="font-bold text-charcoal-900">{formatCurrency(financials.taxAmount, settings.currency_symbol)}</span>
              </div>
            )}
          </div>

          {/* Payable Grand Total */}
          <div className="flex justify-between items-baseline pt-1.5 border-t border-charcoal-200">
            <span className="text-xs font-extrabold uppercase tracking-wider text-charcoal-900">
              Total Payable
            </span>
            <span className="text-lg font-extrabold text-primary-800">
              {formatCurrency(financials.totalAmount, settings.currency_symbol)}
            </span>
          </div>

          {/* Payment Method Selector (Single compact row) */}
          <div className="grid grid-cols-4 gap-1 pt-0.5">
            {[
              { id: 'cash', label: 'Cash', icon: Banknote },
              { id: 'upi', label: 'UPI', icon: QrCode },
              { id: 'card', label: 'Card', icon: CreditCard },
              { id: 'other', label: 'Other', icon: Receipt },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`py-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center space-x-1 transition-all ${
                    isSelected
                      ? 'bg-primary-800 text-white border-primary-800 shadow-2xs'
                      : 'bg-white text-charcoal-700 border-charcoal-200 hover:bg-charcoal-100'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Cash Payment Details (Amount Received & Change Due) */}
          {paymentMethod === 'cash' && (
            <div className="p-2 bg-emerald-50/80 border border-emerald-200 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-900">Cash Received:</span>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-charcoal-400 font-bold text-xs">
                    {settings.currency_symbol}
                  </span>
                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder={financials.totalAmount}
                    className="w-24 pl-5 pr-2 py-0.5 text-xs font-bold bg-white border border-emerald-300 rounded text-right text-charcoal-900 focus:outline-none focus:ring-1 focus:ring-primary-800"
                  />
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex gap-1">
                {[
                  Number(financials.totalAmount),
                  Math.ceil(Number(financials.totalAmount) / 50) * 50,
                  Math.ceil(Number(financials.totalAmount) / 100) * 100,
                  500,
                ].filter((v, i, a) => v > 0 && a.indexOf(v) === i).slice(0, 4).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickCash(val)}
                    className="flex-1 py-0.5 bg-white border border-emerald-300 rounded text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 shadow-2xs"
                  >
                    ₹{val}
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center text-xs font-extrabold text-emerald-900 pt-1 border-t border-emerald-200">
                <span>Change:</span>
                <span>{formatCurrency(financials.changeDue, settings.currency_symbol)}</span>
              </div>
            </div>
          )}

          {/* UPI or Card Reference */}
          {(paymentMethod === 'upi' || paymentMethod === 'card') && (
            <div>
              <input
                type="text"
                value={referenceNote}
                onChange={(e) => setReferenceNote(e.target.value)}
                placeholder={paymentMethod === 'upi' ? "UPI Reference ID (Opt)" : "Card Auth Code (Opt)"}
                className="w-full px-2.5 py-1 text-xs border border-charcoal-300 rounded-lg text-charcoal-900 placeholder-charcoal-400 focus:outline-none"
              />
            </div>
          )}

          {/* Checkout Action Button */}
          <button
            type="button"
            disabled={cartItems.length === 0 || isSubmitting}
            onClick={handleCheckout}
            className="w-full py-2.5 px-3 bg-primary-800 hover:bg-primary-900 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-md flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving Order...</span>
              </>
            ) : (
              <>
                <Printer className="w-3.5 h-3.5 text-accent-400" />
                <span>Complete & Print Bill</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Printable Thermal Receipt Modal */}
      {showReceiptModal && lastCompletedOrder && (
        <ThermalReceipt
          order={lastCompletedOrder}
          onClose={() => setShowReceiptModal(false)}
        />
      )}

      {/* Floor Plan / Table Picker Modal */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-charcoal-200 overflow-hidden">
            <div className="p-4 border-b border-charcoal-100 flex items-center justify-between bg-surface-muted/30">
              <div className="flex items-center space-x-2">
                <LayoutGrid className="w-5 h-5 text-primary-800" />
                <div>
                  <h3 className="text-sm font-bold text-charcoal-900">
                    Floor Plan: Select Dining Table
                  </h3>
                  <p className="text-[11px] text-charcoal-500">
                    Click any table to start billing with its assigned server.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTableModal(false)}
                className="text-charcoal-400 hover:text-charcoal-700 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <TablesManagement
                isModal={true}
                onSelectTable={handleSelectTableFromModal}
                onCloseModal={() => setShowTableModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PosScreen;
