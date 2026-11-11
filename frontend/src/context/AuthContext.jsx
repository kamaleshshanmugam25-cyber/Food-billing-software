import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('pos_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('pos_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      const savedToken = localStorage.getItem('pos_token');
      if (savedToken) {
        try {
          const res = await api.get('/auth/me/');
          setUser(res.data);
          localStorage.setItem('pos_user', JSON.stringify(res.data));
        } catch (err) {
          console.error('Session expired or invalid token:', err);
          logout();
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login/', { username, password });
    const { token: authToken, user: userData } = res.data;
    
    setToken(authToken);
    setUser(userData);
    localStorage.setItem('pos_token', authToken);
    localStorage.setItem('pos_user', JSON.stringify(userData));
    return userData;
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout/');
      }
    } catch (e) {
      // Ignore network errors during logout
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_user');
    }
  };

  const isAdmin = user?.role === 'admin' || user?.is_superuser === true;
  const isCashier = user?.role === 'cashier';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin, isCashier, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
