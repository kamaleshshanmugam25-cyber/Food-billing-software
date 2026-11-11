import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  Clock, 
  Calendar, 
  PlusCircle, 
  User, 
  Search,
  Sparkles,
  Bell,
  Menu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useOnlineOrders } from '../context/OnlineOrdersContext';

const Navbar = ({ onToggleSidebar = () => {} }) => {
  const { user, logout, isAdmin } = useAuth();
  const { settings } = useSettings();
  const { pendingCount, setIsDrawerOpen } = useOnlineOrders();
  const navigate = useNavigate();

  // Real-time ticking clock
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-charcoal-200 px-3 sm:px-6 flex items-center justify-between no-print z-10 shadow-xs gap-2">
      {/* Left: Mobile Menu Toggle & Quick POS / Online Actions */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Hamburger Menu Toggle (Mobile & Tablet) */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 -ml-1 text-charcoal-600 hover:text-charcoal-900 hover:bg-charcoal-100 rounded-lg lg:hidden transition-colors"
          aria-label="Open navigation drawer"
        >
          <Menu className="w-5 h-5 text-charcoal-700" />
        </button>

        <button
          onClick={() => navigate('/pos')}
          className="flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 bg-primary-800 hover:bg-primary-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-accent-400" />
          <span className="hidden sm:inline">New Bill</span>
        </button>

        {/* Real-time Online Orders Bell Indicator */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className={`flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shrink-0 ${
            pendingCount > 0
              ? 'bg-accent-50 text-accent-900 border-accent-300 shadow-2xs animate-pulse'
              : 'bg-charcoal-50 text-charcoal-600 border-charcoal-200 hover:bg-charcoal-100 hover:text-charcoal-900'
          }`}
          title="View Online Delivery Orders"
        >
          <div className="relative">
            <Bell className={`w-3.5 h-3.5 ${pendingCount > 0 ? 'text-accent-600' : 'text-charcoal-500'}`} />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
            )}
          </div>
          <span>Online ({pendingCount})</span>
        </button>

        <div className="hidden xl:flex items-center text-xs text-charcoal-500 font-medium px-3 py-1.5 bg-charcoal-50 rounded-lg border border-charcoal-200">
          <Sparkles className="w-3.5 h-3.5 mr-1.5 text-accent-500" />
          <span>POS-01</span>
        </div>
      </div>

      {/* Center: Live Date & Time Display (Desktop only) */}
      <div className="hidden lg:flex items-center space-x-5 text-xs text-charcoal-600 bg-charcoal-50 px-4 py-1.5 rounded-full border border-charcoal-200">
        <div className="flex items-center space-x-1.5 font-medium">
          <Calendar className="w-3.5 h-3.5 text-primary-700" />
          <span>
            {currentDateTime.toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
        <span className="text-charcoal-300">|</span>
        <div className="flex items-center space-x-1.5 font-semibold text-charcoal-800">
          <Clock className="w-3.5 h-3.5 text-primary-700" />
          <span>
            {currentDateTime.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })}
          </span>
        </div>
      </div>

      {/* Right: Staff Member & Logout */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Staff badge */}
        <div className="flex items-center space-x-2 px-2 sm:px-3 py-1.5 bg-surface-muted rounded-lg border border-charcoal-200">
          <div className="w-7 h-7 rounded-full bg-primary-800 text-accent-400 flex items-center justify-center font-bold text-xs shrink-0">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="text-left hidden md:block">
            <p className="text-xs font-semibold text-charcoal-800 leading-none truncate max-w-[120px]">
              {user?.full_name || user?.username}
            </p>
            <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded-xs inline-block mt-0.5 ${
              isAdmin ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {user?.role || 'Staff'}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          title="Sign Out"
          className="p-2 text-charcoal-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-charcoal-200 hover:border-red-200 transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
