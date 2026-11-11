import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  UserPlus, 
  Key, 
  ShieldCheck, 
  UserCheck, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  X, 
  Lock, 
  Phone, 
  Mail, 
  User as UserIcon,
  Sparkles
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const StaffManagement = () => {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Forms
  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    role: 'cashier',
    phone: '',
  });

  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'cashier',
    phone: '',
    is_active: true,
  });

  const [passwordForm, setPasswordForm] = useState({
    password: '',
  });

  const [showPasswordText, setShowPasswordText] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch staff list
  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/staff/');
      setStaffList(res.data);
    } catch (err) {
      toast.error('Failed to load staff accounts list.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Generate a friendly, secure password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const special = '@#$%';
    let pass = '';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += special.charAt(Math.floor(Math.random() * special.length));
    pass += Math.floor(10 + Math.random() * 90);
    return pass;
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    const autoPass = generateRandomPassword();
    setCreateForm({
      username: '',
      password: autoPass,
      first_name: '',
      last_name: '',
      email: '',
      role: 'cashier',
      phone: '',
    });
    setShowPasswordText(true);
    setShowCreateModal(true);
  };

  // Submit Create Staff
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!createForm.username.trim()) {
      toast.error('Please enter a login username / ID.');
      return;
    }
    if (!createForm.password.trim() || createForm.password.length < 4) {
      toast.error('Password must be at least 4 characters.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/auth/staff/', createForm);
      toast.success(`Account for "${createForm.username}" created successfully!`);
      setShowCreateModal(false);
      fetchStaff();
    } catch (err) {
      const errMsg = err.response?.data?.username?.[0] || 
                     err.response?.data?.detail || 
                     'Failed to create staff account. Check if username already exists.';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (staff) => {
    setSelectedStaff(staff);
    setEditForm({
      first_name: staff.first_name || '',
      last_name: staff.last_name || '',
      email: staff.email || '',
      role: staff.role || 'cashier',
      phone: staff.phone || '',
      is_active: staff.is_active ?? true,
    });
    setShowEditModal(true);
  };

  // Submit Edit Staff
  const handleEditStaff = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;

    try {
      setSubmitting(true);
      await api.patch(`/auth/staff/${selectedStaff.id}/`, editForm);
      toast.success(`Staff account "${selectedStaff.username}" updated!`);
      setShowEditModal(false);
      fetchStaff();
    } catch (err) {
      toast.error('Failed to update staff account.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Password Reset Modal
  const handleOpenPassword = (staff) => {
    setSelectedStaff(staff);
    setPasswordForm({
      password: generateRandomPassword(),
    });
    setShowPasswordText(true);
    setShowPasswordModal(true);
  };

  // Submit Password Reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;
    if (!passwordForm.password.trim() || passwordForm.password.length < 4) {
      toast.error('Password must be at least 4 characters.');
      return;
    }

    try {
      setSubmitting(true);
      await api.patch(`/auth/staff/${selectedStaff.id}/`, {
        password: passwordForm.password,
      });
      toast.success(`Password for "${selectedStaff.username}" has been reset successfully!`);
      setShowPasswordModal(false);
    } catch (err) {
      toast.error('Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete Confirmation
  const handleOpenDelete = (staff) => {
    if (staff.id === currentUser?.id) {
      toast.error('You cannot delete your own active login session.');
      return;
    }
    setSelectedStaff(staff);
    setShowDeleteModal(true);
  };

  // Confirm Delete
  const handleDeleteStaff = async () => {
    if (!selectedStaff) return;
    try {
      setSubmitting(true);
      await api.delete(`/auth/staff/${selectedStaff.id}/`);
      toast.success(`Staff account "${selectedStaff.username}" removed.`);
      setShowDeleteModal(false);
      fetchStaff();
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to delete staff account.';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Toggle Active Status
  const handleToggleActive = async (staff) => {
    if (staff.id === currentUser?.id) {
      toast.error('You cannot deactivate your own account.');
      return;
    }
    try {
      const newStatus = !staff.is_active;
      await api.patch(`/auth/staff/${staff.id}/`, { is_active: newStatus });
      toast.success(`Account "${staff.username}" marked as ${newStatus ? 'Active' : 'Inactive'}.`);
      fetchStaff();
    } catch (err) {
      toast.error('Failed to toggle staff account status.');
    }
  };

  // Filtered staff list
  const filteredStaff = staffList.filter((item) => {
    const matchesSearch = 
      item.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || item.role === roleFilter;
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && item.is_active) || 
      (statusFilter === 'inactive' && !item.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Aggregate stats
  const totalStaff = staffList.length;
  const cashiersCount = staffList.filter((s) => s.role === 'cashier').length;
  const adminsCount = staffList.filter((s) => s.role === 'admin').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-charcoal-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-800 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-charcoal-900 tracking-tight">
              Staff & Login ID Management
            </h2>
          </div>
          <p className="text-xs text-charcoal-500 mt-1">
            Create new login IDs and passwords for Cashiers and Administrators to access the POS terminal.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-primary-800 hover:bg-primary-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4 text-accent-400" />
          <span>Create New Login ID</span>
        </button>
      </div>

      {/* Helpful Hint Card */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 text-xs text-amber-900">
        <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Staff Roles & Permissions</p>
          <p className="text-amber-800 mt-0.5 leading-relaxed">
            <strong>Cashier:</strong> Can open the POS screen, create orders, calculate bills, take payments, and print receipts. Cannot edit restaurant tax settings, menu prices, or view executive sales reports.<br />
            <strong>Administrator:</strong> Has full access including menu editing, pricing, tax rates, sales reports, and creating new staff login IDs.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-charcoal-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-charcoal-500 uppercase tracking-wider">Total Accounts</p>
            <p className="text-2xl font-black text-charcoal-900 mt-1">{totalStaff}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-800 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-charcoal-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-charcoal-500 uppercase tracking-wider">Cashier Logins</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{cashiersCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-charcoal-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-charcoal-500 uppercase tracking-wider">Administrators</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{adminsCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-charcoal-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by username, name, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800"
          />
        </div>

        {/* Filter controls */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="p-2 text-xs border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 font-medium text-charcoal-700"
          >
            <option value="all">All Roles</option>
            <option value="cashier">Cashiers Only</option>
            <option value="admin">Administrators Only</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 text-xs border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 font-medium text-charcoal-700"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <button
            onClick={fetchStaff}
            className="p-2 text-charcoal-500 hover:text-charcoal-800 hover:bg-charcoal-100 rounded-lg transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Staff List Table */}
      <div className="bg-white rounded-2xl border border-charcoal-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-primary-800 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-charcoal-500 font-semibold">Loading staff accounts...</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-charcoal-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-charcoal-700">No staff accounts found</p>
            <p className="text-xs text-charcoal-400 mt-1">Try adjusting your search criteria or create a new login ID.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-charcoal-50 border-b border-charcoal-200 text-charcoal-500 uppercase tracking-wider font-bold">
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Login Username</th>
                  <th className="py-3.5 px-4">System Role</th>
                  <th className="py-3.5 px-4">Phone / Contact</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-100 text-charcoal-800">
                {filteredStaff.map((staff) => {
                  const isCurrent = staff.id === currentUser?.id;
                  const isAdminRole = staff.role === 'admin' || staff.is_superuser;

                  return (
                    <tr key={staff.id} className="hover:bg-charcoal-50/60 transition-colors">
                      {/* Name & Initials */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isAdminRole ? 'bg-amber-100 text-amber-800' : 'bg-primary-100 text-primary-800'
                          }`}>
                            {staff.first_name ? staff.first_name.charAt(0).toUpperCase() : staff.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-charcoal-900 flex items-center space-x-1.5">
                              <span>{staff.full_name || staff.username}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-primary-100 text-primary-800 px-1.5 py-0.2 rounded font-semibold">
                                  You
                                </span>
                              )}
                            </p>
                            {staff.email && (
                              <p className="text-[11px] text-charcoal-400">{staff.email}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Username ID */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold bg-charcoal-100 text-charcoal-800 px-2 py-0.5 rounded text-[11px]">
                          @{staff.username}
                        </span>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {isAdminRole ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                            <span>Administrator</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Cashier</span>
                          </span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 font-medium text-charcoal-600">
                        {staff.phone ? staff.phone : <span className="text-charcoal-300 italic">None</span>}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleActive(staff)}
                          disabled={isCurrent}
                          title={isCurrent ? "Cannot deactivate yourself" : "Click to toggle active status"}
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.8 rounded-full text-[11px] font-bold border transition-colors ${
                            staff.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          {staff.is_active ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* Change Password */}
                          <button
                            onClick={() => handleOpenPassword(staff)}
                            className="p-1.5 text-charcoal-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Reset Password"
                          >
                            <Key className="w-4 h-4" />
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => handleOpenEdit(staff)}
                            className="p-1.5 text-charcoal-500 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Edit Details"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete Account */}
                          {!isCurrent && (
                            <button
                              onClick={() => handleOpenDelete(staff)}
                              className="p-1.5 text-charcoal-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL: CREATE NEW STAFF ================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-charcoal-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-charcoal-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-800 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-charcoal-900">
                  Create New Login ID
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-charcoal-400 hover:text-charcoal-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="mt-4 space-y-4 text-xs">
              {/* Username / Login ID */}
              <div>
                <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                  Login ID / Username *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. cashier1, john_billing, supervisor"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    className="w-full pl-9 pr-3 py-2 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 font-mono font-bold text-charcoal-900"
                  />
                </div>
                <p className="text-[10px] text-charcoal-400 mt-0.5">Staff uses this username to sign in.</p>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-charcoal-700 uppercase tracking-wider">
                    Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const pass = generateRandomPassword();
                      setCreateForm({ ...createForm, password: pass });
                      setShowPasswordText(true);
                    }}
                    className="text-[11px] font-bold text-primary-800 hover:underline flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate Secure</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPasswordText ? "text" : "password"}
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full pl-9 pr-10 py-2 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 font-mono text-charcoal-900 font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Priya"
                    value={createForm.first_name}
                    onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                    className="w-full p-2 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sharma"
                    value={createForm.last_name}
                    onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                    className="w-full p-2 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-800"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                  Access Level / Role *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center space-x-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                      createForm.role === 'cashier'
                        ? 'border-primary-800 bg-primary-50/50 text-primary-900 font-bold'
                        : 'border-charcoal-200 text-charcoal-600 hover:bg-charcoal-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="cashier"
                      checked={createForm.role === 'cashier'}
                      onChange={() => setCreateForm({ ...createForm, role: 'cashier' })}
                      className="text-primary-800 focus:ring-primary-800"
                    />
                    <div>
                      <p className="text-xs font-bold">Cashier</p>
                      <p className="text-[10px] text-charcoal-500 font-normal">POS billing & printing</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center space-x-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                      createForm.role === 'admin'
                        ? 'border-amber-600 bg-amber-50/50 text-amber-900 font-bold'
                        : 'border-charcoal-200 text-charcoal-600 hover:bg-charcoal-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={createForm.role === 'admin'}
                      onChange={() => setCreateForm({ ...createForm, role: 'admin' })}
                      className="text-amber-600 focus:ring-amber-600"
                    />
                    <div>
                      <p className="text-xs font-bold">Administrator</p>
                      <p className="text-[10px] text-charcoal-500 font-normal">Full restaurant control</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-charcoal-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      className="w-full pl-8 pr-2 py-2 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                    Email (Optional)
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-charcoal-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="e.g. staff@restaurant.com"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      className="w-full pl-8 pr-2 py-2 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 text-charcoal-800"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-charcoal-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-charcoal-300 rounded-xl text-charcoal-700 hover:bg-charcoal-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary-800 hover:bg-primary-900 text-white rounded-xl font-bold transition-colors disabled:opacity-60 shadow-xs"
                >
                  {submitting ? 'Creating...' : 'Save & Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT STAFF DETAILS ================= */}
      {showEditModal && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-charcoal-200">
            <div className="flex items-center justify-between pb-3 border-b border-charcoal-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-800 flex items-center justify-center">
                  <Edit className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-charcoal-900">
                  Edit Staff: @{selectedStaff.username}
                </h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-charcoal-400 hover:text-charcoal-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditStaff} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    className="w-full p-2 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    className="w-full p-2 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                  Access Level / Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full p-2 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 font-semibold"
                >
                  <option value="cashier">Cashier (POS & Billing only)</option>
                  <option value="admin">Administrator (Full control)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full p-2 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full p-2 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800"
                  />
                </div>
              </div>

              {selectedStaff.id !== currentUser?.id && (
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="edit_is_active"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                    className="rounded text-primary-800 focus:ring-primary-800 w-4 h-4"
                  />
                  <label htmlFor="edit_is_active" className="font-bold text-charcoal-800 cursor-pointer">
                    Account is Active (Can log in to terminal)
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-charcoal-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-charcoal-300 rounded-xl text-charcoal-700 hover:bg-charcoal-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary-800 hover:bg-primary-900 text-white rounded-xl font-bold transition-colors disabled:opacity-60 shadow-xs"
                >
                  {submitting ? 'Saving...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RESET PASSWORD ================= */}
      {showPasswordModal && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-charcoal-200">
            <div className="flex items-center justify-between pb-3 border-b border-charcoal-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-charcoal-900">
                  Reset Password: @{selectedStaff.username}
                </h3>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-charcoal-400 hover:text-charcoal-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="mt-4 space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-charcoal-700 uppercase tracking-wider">
                    New Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordForm({ password: generateRandomPassword() });
                      setShowPasswordText(true);
                    }}
                    className="text-[11px] font-bold text-primary-800 hover:underline flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate Random</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPasswordText ? "text" : "password"}
                    required
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm({ password: e.target.value })}
                    className="w-full pl-9 pr-10 py-2 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-800 font-mono text-charcoal-900 font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-charcoal-400 mt-1">
                  Share this new password with <strong>{selectedStaff.full_name || selectedStaff.username}</strong> so they can log in.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-charcoal-100">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 border border-charcoal-300 rounded-xl text-charcoal-700 hover:bg-charcoal-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-colors disabled:opacity-60 shadow-xs"
                >
                  {submitting ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE CONFIRMATION ================= */}
      {showDeleteModal && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-charcoal-200">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-charcoal-900">
                Delete Staff Account?
              </h3>
              <p className="text-xs text-charcoal-500 mt-1.5 leading-relaxed">
                Are you sure you want to delete login account <strong>@{selectedStaff.username}</strong> ({selectedStaff.full_name})? This cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-charcoal-300 rounded-xl text-xs font-bold text-charcoal-700 hover:bg-charcoal-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStaff}
                disabled={submitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-60"
              >
                {submitting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
