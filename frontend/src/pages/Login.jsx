import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Lock, User, LogIn, AlertCircle, ShieldCheck, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      if (!err.response || err.message === 'Network Error') {
        setError('Cannot connect to backend server. Please verify Django server is running on port 8000.');
      } else {
        const msg = err.response?.data?.non_field_errors?.[0] || 
                    err.response?.data?.detail || 
                    err.response?.data?.error || 
                    'Invalid username or password. Please try again.';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="min-h-screen bg-charcoal-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary-800 flex items-center justify-center text-white shadow-lg shadow-primary-900/10 mb-4">
          <UtensilsCrossed className="w-7 h-7 text-accent-400" />
        </div>

        <h2 className="text-2xl font-extrabold text-charcoal-900 tracking-tight">
          {settings.restaurant_name || "Green Spices Restaurant"}
        </h2>
        <p className="mt-1 text-xs text-charcoal-500 font-medium">
          Professional Point of Sale & Billing Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-card rounded-2xl border border-charcoal-200/80 sm:px-10">
          {error && (
            <div className="mb-5 flex items-center p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 mr-2 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-1">
                Username
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-charcoal-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or cashier"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-charcoal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800 focus:border-transparent text-charcoal-800 placeholder-charcoal-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-charcoal-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-10 py-2 text-sm border border-charcoal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-800 focus:border-transparent text-charcoal-800 placeholder-charcoal-400 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-charcoal-400 hover:text-charcoal-700 focus:outline-none transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-xs font-bold text-white bg-primary-800 hover:bg-primary-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-800 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <LogIn className="w-4 h-4 mr-2 text-accent-400" />
              )}
              <span>{loading ? 'Authenticating...' : 'Sign In to Terminal'}</span>
            </button>
          </form>

          {/* Quick Demo Access Credentials */}
          <div className="mt-6 pt-5 border-t border-charcoal-100">
            <p className="text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider text-center mb-2.5">
              Quick Test Credentials
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('billing', 'kamalesh')}
                className="py-1.5 px-2 bg-primary-50 hover:bg-primary-100 border border-primary-200 text-primary-900 rounded-lg text-[10px] font-bold flex items-center justify-center space-x-1 transition-colors"
                title="Superuser: billing / kamalesh"
              >
                <Sparkles className="w-3 h-3 text-primary-700" />
                <span className="truncate">Billing</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('admin', 'admin123')}
                className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-lg text-[10px] font-bold flex items-center justify-center space-x-1 transition-colors"
                title="Admin: admin / admin123"
              >
                <ShieldCheck className="w-3 h-3 text-amber-600" />
                <span className="truncate">Admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('cashier', 'cashier123')}
                className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 rounded-lg text-[10px] font-bold flex items-center justify-center space-x-1 transition-colors"
                title="Cashier: cashier / cashier123"
              >
                <User className="w-3 h-3 text-emerald-600" />
                <span className="truncate">Cashier</span>
              </button>
            </div>
            <p className="text-[10px] text-charcoal-400 text-center mt-2">
              billing: kamalesh | admin: admin123 | cashier: cashier123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
