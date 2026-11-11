import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { OnlineOrdersProvider } from './context/OnlineOrdersContext';

import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PosScreen from './pages/PosScreen';
import OrderHistory from './pages/OrderHistory';
import MenuManagement from './pages/MenuManagement';
import CategoriesManagement from './pages/CategoriesManagement';
import Reports from './pages/Reports';
import StaffManagement from './pages/StaffManagement';
import TablesManagement from './pages/TablesManagement';
import Settings from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <SettingsProvider>
            <CartProvider>
              <OnlineOrdersProvider>
                <Routes>
                  {/* Public Authentication Route */}
                  <Route path="/login" element={<Login />} />

                  {/* Protected Restaurant POS Routes */}
                  <Route path="/" element={<MainLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="pos" element={<PosScreen />} />
                    <Route path="orders" element={<OrderHistory />} />
                    <Route path="menu" element={<MenuManagement />} />
                    <Route path="categories" element={<CategoriesManagement />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="tables" element={<TablesManagement />} />
                    <Route path="staff" element={<StaffManagement />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>

                  {/* Catch-all redirect */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </OnlineOrdersProvider>
            </CartProvider>
          </SettingsProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
