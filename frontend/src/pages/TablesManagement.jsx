import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  X, 
  UserCheck, 
  RefreshCw, 
  UtensilsCrossed,
  Receipt,
  Sparkles
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/formatters';

const SECTIONS = ['All', 'Main Dining', 'AC Hall', 'Family Section'];

const TablesManagement = ({ onSelectTable = null, isModal = false, onCloseModal = () => {} }) => {
  const toast = useToast();
  const navigate = useNavigate();

  const [tables, setTables] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [selectedSection, setSelectedSection] = useState('All');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form for adding table
  const [newTable, setNewTable] = useState({
    table_number: '',
    section: 'Main Dining',
    capacity: 4,
    assigned_staff_id: '',
  });

  // Fetch tables and staff
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tablesRes, staffRes] = await Promise.all([
        api.get('/orders/tables/'),
        api.get('/auth/staff/'),
      ]);
      setTables(tablesRes.data);
      setStaffList(staffRes.data);
    } catch (err) {
      toast.error('Failed to load tables and staff records.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Quick assign staff to table
  const handleAssignStaff = async (tableId, staffId) => {
    try {
      const res = await api.post(`/orders/tables/${tableId}/assign-staff/`, {
        staff_id: staffId ? Number(staffId) : null,
      });
      toast.success(res.data.message || 'Staff assigned to table successfully!');
      fetchData();
    } catch (err) {
      toast.error('Failed to assign staff to table.');
    }
  };

  // Clear / Reset occupied table
  const handleClearTable = async (tableId) => {
    try {
      const res = await api.post(`/orders/tables/${tableId}/clear-table/`);
      toast.success(res.data.message || 'Table reset to Available.');
      fetchData();
    } catch (err) {
      toast.error('Failed to clear table.');
    }
  };

  // Add new table
  const handleAddTable = async (e) => {
    e.preventDefault();
    if (!newTable.table_number.trim()) {
      toast.error('Please enter a table name/number.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        table_number: newTable.table_number.trim(),
        section: newTable.section,
        capacity: Number(newTable.capacity) || 4,
        assigned_staff_id: newTable.assigned_staff_id ? Number(newTable.assigned_staff_id) : null,
      };
      await api.post('/orders/tables/', payload);
      toast.success(`Table "${payload.table_number}" created!`);
      setShowAddModal(false);
      setNewTable({ table_number: '', section: 'Main Dining', capacity: 4, assigned_staff_id: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.table_number?.[0] || 'Failed to create table.');
    } finally {
      setSaving(false);
    }
  };

  // Filtered tables
  const filteredTables = tables.filter((t) => {
    if (selectedSection === 'All') return true;
    return t.section === selectedSection;
  });

  // Aggregate stats
  const totalTables = tables.length;
  const availableCount = tables.filter((t) => t.status === 'available').length;
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;
  const assignedCount = tables.filter((t) => t.assigned_staff).length;

  return (
    <div className={`space-y-6 ${isModal ? 'p-1' : 'max-w-7xl mx-auto pb-10'}`}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-charcoal-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-800 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-charcoal-900 tracking-tight">
              Table & Waiter Assignment
            </h2>
          </div>
          <p className="text-xs text-charcoal-500 mt-1">
            Assign staff members and waiters to dining tables. Assigned servers appear on orders and thermal print receipts.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-primary-800 hover:bg-primary-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-accent-400" />
            <span>Add New Table</span>
          </button>

          <button
            onClick={fetchData}
            className="p-2 text-charcoal-500 hover:text-charcoal-900 bg-charcoal-100 hover:bg-charcoal-200 rounded-xl transition-colors"
            title="Refresh tables"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-charcoal-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-wider">Total Tables</p>
          <p className="text-xl font-black text-charcoal-900 mt-0.5">{totalTables}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-charcoal-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-wider">Available</p>
          <p className="text-xl font-black text-emerald-700 mt-0.5">{availableCount}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-charcoal-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-wider">Occupied</p>
          <p className="text-xl font-black text-amber-700 mt-0.5">{occupiedCount}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-charcoal-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-wider">Staff Assigned</p>
          <p className="text-xl font-black text-primary-800 mt-0.5">{assignedCount}</p>
        </div>
      </div>

      {/* Section Filter Pills */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 select-none">
        {SECTIONS.map((sec) => (
          <button
            key={sec}
            onClick={() => setSelectedSection(sec)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedSection === sec
                ? 'bg-primary-800 text-white shadow-xs'
                : 'bg-white border border-charcoal-200/80 text-charcoal-600 hover:text-charcoal-900 hover:bg-charcoal-50'
            }`}
          >
            {sec}
          </button>
        ))}
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-primary-800 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-charcoal-500 font-semibold">Loading tables and assigned staff...</p>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-charcoal-200/80 p-8">
          <LayoutGrid className="w-12 h-12 text-charcoal-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-charcoal-800">No tables in this section</h4>
          <p className="text-xs text-charcoal-400 mt-1">Click "Add New Table" to create a table in this section.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTables.map((t) => {
            const isOccupied = t.status === 'occupied';

            return (
              <div
                key={t.id}
                className={`bg-white rounded-2xl border p-4 shadow-2xs transition-all flex flex-col justify-between space-y-3 ${
                  isOccupied
                    ? 'border-amber-300 ring-1 ring-amber-200/50'
                    : 'border-charcoal-200/80 hover:border-primary-400'
                }`}
              >
                {/* Table Header: Name, Capacity & Status Badge */}
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-charcoal-900 tracking-tight">
                        {t.table_number}
                      </h3>
                      <p className="text-[11px] text-charcoal-400 font-medium">
                        {t.section} • {t.capacity} Seats
                      </p>
                    </div>

                    <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isOccupied
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOccupied ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                      <span>{isOccupied ? 'Occupied' : 'Available'}</span>
                    </span>
                  </div>

                  {/* Active Order Details if Occupied */}
                  {isOccupied && t.active_order_number && (
                    <div className="mt-2.5 p-2 bg-amber-50/60 border border-amber-100 rounded-lg text-xs flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-900 text-[11px]">
                        #{t.active_order_number}
                      </span>
                      <span className="font-black text-amber-900">
                        {formatCurrency(t.active_order_amount)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Assigned Staff Selector */}
                <div className="pt-2 border-t border-charcoal-100 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-charcoal-500 uppercase tracking-wider flex items-center space-x-1">
                      <UserCheck className="w-3.5 h-3.5 text-primary-700" />
                      <span>Assigned Server</span>
                    </span>
                    {t.assigned_staff && (
                      <span className="text-[10px] text-primary-800 font-bold bg-primary-50 px-1.5 py-0.2 rounded">
                        Active
                      </span>
                    )}
                  </div>

                  {/* Dropdown to assign or change staff on this table */}
                  <select
                    value={t.assigned_staff || ''}
                    onChange={(e) => handleAssignStaff(t.id, e.target.value)}
                    className="w-full text-xs font-semibold p-2 border border-charcoal-200 rounded-lg bg-surface-muted text-charcoal-800 focus:outline-none focus:ring-1 focus:ring-primary-800 cursor-pointer"
                  >
                    <option value="">-- No Staff Assigned --</option>
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.full_name || st.username} ({st.role === 'admin' ? 'Admin' : 'Cashier/Waiter'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="pt-1 flex items-center space-x-1.5">
                  {onSelectTable ? (
                    <button
                      type="button"
                      onClick={() => onSelectTable(t)}
                      className="w-full py-2 bg-primary-800 hover:bg-primary-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center space-x-1"
                    >
                      <Receipt className="w-3.5 h-3.5 text-accent-400" />
                      <span>Bill Table</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => navigate('/pos')}
                        className="flex-1 py-1.5 bg-primary-800 hover:bg-primary-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center justify-center space-x-1"
                      >
                        <Receipt className="w-3.5 h-3.5 text-accent-400" />
                        <span>Open Bill</span>
                      </button>

                      {isOccupied && (
                        <button
                          type="button"
                          onClick={() => handleClearTable(t.id)}
                          className="px-2.5 py-1.5 border border-charcoal-200 hover:bg-charcoal-100 text-charcoal-600 rounded-lg text-[11px] font-semibold transition-colors"
                          title="Reset status to available"
                        >
                          Clear
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add New Table */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-charcoal-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-charcoal-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-800 flex items-center justify-center">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-charcoal-900">
                  Add Restaurant Table
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-charcoal-400 hover:text-charcoal-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTable} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                  Table Name / Identifier *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Table 7, AC 3, Outdoor 1"
                  value={newTable.table_number}
                  onChange={(e) => setNewTable({ ...newTable, table_number: e.target.value })}
                  className="w-full p-2.5 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 font-bold text-charcoal-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                    Section
                  </label>
                  <select
                    value={newTable.section}
                    onChange={(e) => setNewTable({ ...newTable, section: e.target.value })}
                    className="w-full p-2.5 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 font-semibold text-charcoal-800"
                  >
                    <option value="Main Dining">Main Dining</option>
                    <option value="AC Hall">AC Hall</option>
                    <option value="Family Section">Family Section</option>
                    <option value="Outdoor Terrace">Outdoor Terrace</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                    Capacity (Seats)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={newTable.capacity}
                    onChange={(e) => setNewTable({ ...newTable, capacity: e.target.value })}
                    className="w-full p-2.5 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 font-bold text-charcoal-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                  Assign Staff / Waiter (Optional)
                </label>
                <select
                  value={newTable.assigned_staff_id}
                  onChange={(e) => setNewTable({ ...newTable, assigned_staff_id: e.target.value })}
                  className="w-full p-2.5 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-800 font-medium"
                >
                  <option value="">-- Leave Unassigned for now --</option>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.full_name || st.username} ({st.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-charcoal-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-charcoal-300 rounded-xl text-charcoal-700 hover:bg-charcoal-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-primary-800 hover:bg-primary-900 text-white rounded-xl font-bold transition-colors disabled:opacity-60 shadow-xs"
                >
                  {saving ? 'Creating...' : 'Save Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TablesManagement;
