import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Receipt, 
  History, 
  UtensilsCrossed, 
  Layers, 
  BarChart3, 
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  LayoutGrid,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  const { user, isAdmin } = useAuth();
  const { settings } = useSettings();

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/pos', label: 'New Bill / POS', icon: Receipt, highlight: true },
    { to: '/orders', label: 'Order History', icon: History },
    { to: '/tables', label: 'Tables & Waiters', icon: LayoutGrid },
    { to: '/menu', label: 'Food Menu', icon: UtensilsCrossed },
    { to: '/categories', label: 'Categories', icon: Layers },
    { to: '/reports', label: 'Sales Reports', icon: BarChart3, adminOnly: true },
    { to: '/staff', label: 'Staff & Logins', icon: Users, adminOnly: true },
    { to: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
  ];

  return (
    <>
      {/* Mobile Dimmed Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-charcoal-900/60 backdrop-blur-xs lg:hidden animate-in fade-in duration-150"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer Container (Fixed slide-in on mobile, static on desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white border-r border-charcoal-200 flex flex-col h-full select-none no-print transition-transform duration-200 ease-in-out lg:static lg:w-64 lg:translate-x-0 shrink-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand & Logo Section */}
        <div className="h-16 flex items-center justify-between px-5 sm:px-6 border-b border-charcoal-100 bg-surface-muted/50">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-primary-800 flex items-center justify-center text-white shadow-xs shrink-0">
              <UtensilsCrossed className="w-5 h-5 text-accent-400" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-charcoal-900 truncate tracking-tight">
                {settings.restaurant_name || "Green Spices"}
              </h1>
              <p className="text-[11px] font-medium text-primary-700 tracking-wide uppercase">
                Billing & POS
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -mr-1.5 text-charcoal-400 hover:text-charcoal-700 hover:bg-charcoal-100 rounded-lg lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-charcoal-400 uppercase tracking-wider">
          Main Navigation
        </div>

        {navLinks.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-primary-800 text-white shadow-xs font-bold'
                    : item.highlight
                    ? 'text-primary-800 bg-primary-50 hover:bg-primary-100 font-semibold'
                    : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-charcoal-100/70'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-accent-400' : 'text-current'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.highlight && !isActive && (
                    <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse"></span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Staff Session Status Card */}
      <div className="p-3 border-t border-charcoal-100 bg-surface-muted/60">
        <div className="bg-white p-3 rounded-lg border border-charcoal-200/80 shadow-xs flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
            isAdmin ? 'bg-amber-100 text-amber-800' : 'bg-primary-100 text-primary-800'
          }`}>
            {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-charcoal-800 truncate">
              {user?.full_name || user?.username || 'Staff Member'}
            </p>
            <p className="text-[10px] text-charcoal-500 capitalize flex items-center space-x-1">
              <span>{user?.role || 'Cashier'} Role</span>
            </p>
          </div>
        </div>
      </div>
    </aside>
  </>
  );
};

export default Sidebar;
