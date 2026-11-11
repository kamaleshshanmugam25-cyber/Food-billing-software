import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  UtensilsCrossed,
  Filter,
  Layers,
  Sparkles,
  RefreshCw,
  Image as ImageIcon,
  UploadCloud,
  FolderOpen,
  Camera
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const MenuManagement = () => {
  const { settings } = useSettings();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: '',
    price: '',
    description: '',
    image_url: '',
    is_available: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Delete Confirm
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [catsRes, itemsRes] = await Promise.all([
        api.get('/menu/categories/'),
        api.get('/menu/items/'),
      ]);
      setCategories(catsRes.data);
      setItems(itemsRes.data);
    } catch (err) {
      toast.error('Failed to load menu data.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);

      const matchCat = !categoryFilter || item.category === Number(categoryFilter);
      const matchAvail =
        availabilityFilter === '' ||
        (availabilityFilter === 'true' && item.is_available) ||
        (availabilityFilter === 'false' && !item.is_available);

      return matchSearch && matchCat && matchAvail;
    });
  }, [items, search, categoryFilter, availabilityFilter]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setShowUrlInput(false);
    setFormData({
      sku: `ITM-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      category: categories[0]?.id || '',
      price: '',
      description: '',
      image_url: '',
      is_available: true,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setShowUrlInput(false);
    setFormData({
      sku: item.sku,
      name: item.name,
      category: item.category,
      price: item.price,
      description: item.description || '',
      image_url: item.image_url || '',
      is_available: item.is_available,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // Handle Image File Selection from PC Local Storage
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.warning('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize to maximum 600px width/height while maintaining aspect ratio
        const maxDim = 600;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // Compressed JPEG data URL
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

        setFormData((prev) => ({
          ...prev,
          image_url: optimizedDataUrl,
        }));
        toast.info('Image loaded from your PC.');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.name.trim()) errors.name = 'Item name is required.';
    if (!formData.sku.trim()) errors.sku = 'SKU / item ID is required.';
    if (!formData.category) errors.category = 'Category must be selected.';
    const numPrice = Number(formData.price);
    if (isNaN(numPrice) || numPrice <= 0) errors.price = 'Price must be greater than 0.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        sku: formData.sku.trim().toUpperCase(),
        name: formData.name.trim(),
        category: formData.category,
        price: numPrice.toFixed(2),
        description: formData.description.trim(),
        image_url: formData.image_url.trim(),
        is_available: formData.is_available,
      };

      if (editingItem) {
        await api.put(`/menu/items/${editingItem.id}/`, payload);
        toast.success(`'${payload.name}' updated successfully.`);
      } else {
        await api.post('/menu/items/', payload);
        toast.success(`'${payload.name}' added to menu.`);
      }

      setModalOpen(false);
      fetchData();
    } catch (err) {
      const errRes = err.response?.data;
      if (errRes && typeof errRes === 'object') {
        const parsed = {};
        for (const [key, val] of Object.entries(errRes)) {
          parsed[key] = Array.isArray(val) ? val.join(' ') : val;
        }
        setFormErrors(parsed);
      } else {
        toast.error('Failed to save food item.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteConfirmItem) return;
    try {
      await api.delete(`/menu/items/${deleteConfirmItem.id}/`);
      toast.success(`'${deleteConfirmItem.name}' removed.`);
      setDeleteConfirmItem(null);
      fetchData();
    } catch (err) {
      toast.error('Could not delete item. If it has historical orders, consider marking it out of stock instead.');
    }
  };

  const handleClearSampleData = async () => {
    if (!window.confirm('Are you sure you want to delete all sample menu items? This will remove items seeded during setup.')) return;
    try {
      const res = await api.post('/menu/items/clear-sample-data/');
      toast.success(res.data.message);
      fetchData();
    } catch (err) {
      toast.error('Failed to clear sample data.');
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-charcoal-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-charcoal-900 tracking-tight">
            Food Menu Management
          </h2>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Configure restaurant food catalog, photos from your PC, pricing, SKU codes, and live availability.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {isAdmin ? (
            <>
              <button
                onClick={handleClearSampleData}
                className="px-3 py-2 bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-700 rounded-lg text-xs font-semibold"
              >
                Clear Sample Data
              </button>

              <button
                onClick={handleOpenAdd}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-primary-800 hover:bg-primary-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4 text-accent-400" />
                <span>+ Add Food Item</span>
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-lg text-xs">
              <span className="font-medium">Cashier View (Read-Only)</span>
              <span className="text-amber-700 font-semibold">• Log in as Admin to Add/Edit</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-charcoal-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items by name, SKU..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-charcoal-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-800"
          />
        </div>

        {/* Category filter */}
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs border border-charcoal-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-800 font-medium"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Availability filter */}
        <div>
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs border border-charcoal-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-800 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="true">Available (In Stock)</option>
            <option value="false">Unavailable (Out of Stock)</option>
          </select>
        </div>
      </div>

      {/* Menu Items Table with Food Thumbnails */}
      <div className="bg-white rounded-2xl border border-charcoal-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-800 rounded-full animate-spin"></div>
            <p className="mt-2 text-xs text-charcoal-500">Loading Menu Catalog...</p>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-charcoal-50/80 text-charcoal-500 font-semibold uppercase text-[10px] tracking-wider border-b border-charcoal-100">
                <tr>
                  <th className="py-3 px-5">Dish</th>
                  <th className="py-3 px-4">SKU / Code</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-center">Availability</th>
                  <th className="py-3 px-4">Sample Tag</th>
                  {isAdmin && <th className="py-3 px-5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-100 text-charcoal-700">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-charcoal-50/60 transition-colors">
                    {/* Dish with Photo & Name */}
                    <td className="py-3 px-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-lg bg-charcoal-100 overflow-hidden flex-shrink-0 border border-charcoal-200">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-charcoal-400">
                              <UtensilsCrossed className="w-5 h-5 opacity-40" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-charcoal-900 text-xs">{item.name}</p>
                          {item.description && (
                            <p className="text-[10px] text-charcoal-500 line-clamp-1 max-w-xs mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-charcoal-700">
                      {item.sku}
                    </td>

                    <td className="py-3 px-4 font-semibold text-charcoal-700">
                      {item.category_name}
                    </td>

                    <td className="py-3 px-4 text-right font-extrabold text-charcoal-900">
                      {formatCurrency(item.price, settings.currency_symbol)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.is_available
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {item.is_available ? 'AVAILABLE' : 'OUT OF STOCK'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {item.is_sample_data ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">
                          SAMPLE
                        </span>
                      ) : (
                        <span className="text-[9px] text-charcoal-400 font-medium">CUSTOM</span>
                      )}
                    </td>

                    {isAdmin && (
                      <td className="py-3 px-5 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          title="Edit Item"
                          className="p-1.5 text-primary-800 hover:text-primary-900 hover:bg-primary-50 rounded-md transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeleteConfirmItem(item)}
                          title="Delete Item"
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-charcoal-400 text-xs">
            <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 text-charcoal-300" />
            <p className="font-semibold text-charcoal-600">No food items matching filter.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Food Item Modal with PC Local Storage Image Picker */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 no-print animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-charcoal-200 max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-charcoal-900 mb-4 pb-2 border-b border-charcoal-100 flex items-center justify-between">
              <span>{editingItem ? `Edit: ${editingItem.name}` : 'Add New Food Item'}</span>
              <button
                onClick={() => setModalOpen(false)}
                className="text-charcoal-400 hover:text-charcoal-700 p-1"
              >
                ✕
              </button>
            </h3>

            <form onSubmit={handleSaveItem} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                    Unique SKU / Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="e.g. BIR-001"
                    className="w-full p-2 border border-charcoal-300 rounded-lg uppercase font-mono focus:outline-none focus:ring-1 focus:ring-primary-800"
                  />
                  {formErrors.sku && <p className="text-rose-600 text-[10px] mt-0.5">{formErrors.sku}</p>}
                </div>

                <div>
                  <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                    Selling Price ({settings.currency_symbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="250.00"
                    className="w-full p-2 border border-charcoal-300 rounded-lg font-bold focus:outline-none focus:ring-1 focus:ring-primary-800"
                  />
                  {formErrors.price && <p className="text-rose-600 text-[10px] mt-0.5">{formErrors.price}</p>}
                </div>
              </div>

              <div>
                <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                  Food Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Special Chicken Dum Biryani"
                  className="w-full p-2 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 font-semibold text-charcoal-900"
                />
                {formErrors.name && <p className="text-rose-600 text-[10px] mt-0.5">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: Number(e.target.value) })}
                  className="w-full p-2 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-800 font-medium"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {formErrors.category && <p className="text-rose-600 text-[10px] mt-0.5">{formErrors.category}</p>}
              </div>

              {/* CHOOSE IMAGE FROM PC LOCAL STORAGE */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-charcoal-700 uppercase tracking-wider">
                    Dish Photo (Choose from PC)
                  </label>
                  {formData.image_url && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image_url: '' })}
                      className="text-[10px] text-rose-600 hover:text-rose-700 font-bold"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                {formData.image_url ? (
                  <div className="flex items-center space-x-3 p-3 bg-charcoal-50 rounded-xl border border-charcoal-200">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-16 h-16 rounded-xl object-cover border border-charcoal-300 shadow-2xs flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-charcoal-800">Photo Attached</p>
                      <p className="text-[10px] text-charcoal-500">Will display in POS grid and cart</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-1.5 px-3 py-1 bg-white border border-charcoal-300 hover:bg-charcoal-100 rounded-lg text-[11px] font-bold text-charcoal-800 shadow-2xs flex items-center space-x-1"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-primary-800" />
                        <span>Choose Different Photo from PC</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 border-2 border-dashed border-charcoal-300 hover:border-primary-700 rounded-xl bg-charcoal-50 hover:bg-primary-50/30 flex flex-col items-center justify-center cursor-pointer transition-all group"
                  >
                    <div className="w-11 h-11 rounded-full bg-white border border-charcoal-200 group-hover:border-primary-500 flex items-center justify-center text-primary-800 shadow-2xs mb-2 transition-transform group-hover:scale-105">
                      <UploadCloud className="w-5 h-5 text-primary-800" />
                    </div>
                    <p className="font-bold text-xs text-charcoal-800 group-hover:text-primary-900">
                      Click to Browse Photo from Your PC
                    </p>
                    <p className="text-[10px] text-charcoal-500 mt-0.5">
                      Select JPG, PNG, or WEBP from your computer storage
                    </p>
                  </div>
                )}

                {/* Optional Web Link Switcher */}
                <div className="mt-1.5 text-right">
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-[10px] font-semibold text-charcoal-500 hover:text-charcoal-800 underline"
                  >
                    {showUrlInput ? 'Hide Web URL' : 'Or paste a web image link'}
                  </button>
                </div>

                {showUrlInput && (
                  <div className="mt-1">
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://... (Optional web link)"
                      className="w-full p-2 border border-charcoal-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ingredients, preparation style or serving size..."
                  className="w-full p-2 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-800"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="avail-checkbox"
                  checked={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                  className="rounded text-primary-800 focus:ring-primary-800 w-4 h-4"
                />
                <label htmlFor="avail-checkbox" className="font-bold text-charcoal-800 cursor-pointer">
                  Available for sale (In Stock)
                </label>
              </div>

              <div className="mt-5 pt-3 border-t border-charcoal-100 flex justify-end space-x-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary-800 hover:bg-primary-900 text-white rounded-lg font-bold"
                >
                  {saving ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 no-print animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-charcoal-200">
            <h3 className="text-base font-bold text-charcoal-900 mb-2">Delete Food Item?</h3>
            <p className="text-xs text-charcoal-600 mb-4 leading-relaxed">
              Are you sure you want to remove <strong>{deleteConfirmItem.name}</strong> ({deleteConfirmItem.sku})?
            </p>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="px-3 py-1.5 bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteItem}
                className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;
