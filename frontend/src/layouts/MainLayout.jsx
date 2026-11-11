import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import OnlineOrdersModal from '../components/OnlineOrdersModal';
import { useAuth } from '../context/AuthContext';

const MainLayout = () => {
  const { isAuthenticated, loading } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-charcoal-50">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-800 rounded-full animate-spin"></div>
        <p className="mt-3 text-xs font-semibold text-charcoal-600 tracking-wide">
          Loading Restaurant System...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-screen bg-charcoal-50 overflow-hidden font-sans">
      {/* Left Sidebar (Desktop static, Mobile slide-in drawer) */}
      <Sidebar 
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar 
          onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        />

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 bg-charcoal-50/70">
          <Outlet />
        </main>
      </div>

      {/* Global Real-time Online Orders Modal & Audio Notification Banner */}
      <OnlineOrdersModal />
    </div>
  );
};

export default MainLayout;
