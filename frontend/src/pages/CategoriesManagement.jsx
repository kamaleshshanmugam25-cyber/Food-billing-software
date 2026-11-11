import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Plus, Edit, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const CategoriesManagement = () => {
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/menu/categories/');
      setCategories(res.data);
    } catch (err) {
      toast.error('Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setDisplayOrder(categories.length + 1);
    setIsActive(true);
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setDisplayOrder(cat.display_order);
    setIsActive(cat.is_active);
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        description: description.trim(),
        display_order: Number(displayOrder) || 0,
        is_active: isActive,
      };

      if (editingCategory) {
        await api.put(`/menu/categories/${editingCategory.id}/`, payload);
        toast.success(`Category '${payload.name}' updated.`);
      } else {
        await api.post('/menu/categories/', payload);
        toast.success(`Category '${payload.name}' created.`);
      }

      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      const errMsg = err.response?.data?.name?.[0] || 'Failed to save category.';
      setError(errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-charcoal-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-charcoal-900 tracking-tight">
            Menu Category Management
          </h2>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Organize food offerings into clean categories for quick POS cashier selection.
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-primary-800 hover:bg-primary-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-accent-400" />
            <span>Add Category</span>
          </button>
        ) : (
          <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-lg text-xs">
            <span className="font-medium">Cashier View (Read-Only)</span>
            <span className="text-amber-700 font-semibold">• Log in as Admin to Add</span>
          </div>
        )}
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-2xl border border-charcoal-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-800 rounded-full animate-spin"></div>
            <p className="mt-2 text-xs text-charcoal-500">Loading Categories...</p>
          </div>
        ) : categories.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-charcoal-50/80 text-charcoal-500 font-semibold uppercase text-[10px] tracking-wider border-b border-charcoal-100">
                <tr>
                  <th className="py-3 px-5 text-center">Order</th>
                  <th className="py-3 px-4">Category Name</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Items Count</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  {isAdmin && <th className="py-3 px-5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-100 text-charcoal-700">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-charcoal-50/60 transition-colors">
                    <td className="py-3.5 px-5 text-center font-bold font-mono text-charcoal-500">
                      #{cat.display_order}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-charcoal-900">
                      {cat.name}
                    </td>
                    <td className="py-3.5 px-4 text-charcoal-500 max-w-xs truncate">
                      {cat.description || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold bg-charcoal-100 px-2 py-0.5 rounded text-charcoal-700">
                        {cat.items_count} items
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        cat.is_active
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-charcoal-100 text-charcoal-600'
                      }`}>
                        {cat.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => handleOpenEdit(cat)}
                          className="p-1.5 text-primary-800 hover:text-primary-900 hover:bg-primary-50 rounded-md transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
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
            <Layers className="w-8 h-8 mx-auto mb-2 text-charcoal-300" />
            <p className="font-semibold text-charcoal-600">No categories found.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 no-print animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-charcoal-200">
            <h3 className="text-base font-bold text-charcoal-900 mb-4 pb-2 border-b border-charcoal-100">
              {editingCategory ? `Edit: ${editingCategory.name}` : 'New Category'}
            </h3>

            {error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Starters & Appetizers"
                  className="w-full p-2 border border-charcoal-300 rounded-lg font-semibold focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-900"
                />
              </div>

              <div>
                <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                  Display Sequence Order
                </label>
                <input
                  type="number"
                  min="0"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                  className="w-full p-2 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800"
                />
              </div>

              <div>
                <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows="2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief note about this category..."
                  className="w-full p-2 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-800"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="active-cat"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-primary-800 focus:ring-primary-800 w-4 h-4"
                />
                <label htmlFor="active-cat" className="font-bold text-charcoal-800 cursor-pointer">
                  Category is Active (Visible on POS screen)
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
                  {saving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesManagement;
