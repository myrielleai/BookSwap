import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, userService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('bookswap_token') || null);
  const [loading, setLoading] = useState(true);

  // Fetch current user profile if token exists
  const fetchProfile = async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await userService.getProfile();
      if (res.success && res.data) {
        setUser(res.data.user || res.data);
      } else {
        // Invalid session
        logout();
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
      // Clear expired or invalid token
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await authService.login(email, password);
      if (res.success && res.data) {
        const { token: newToken, user: userData } = res.data;
        localStorage.setItem('bookswap_token', newToken);
        setToken(newToken);
        setUser(userData);
        return { success: true, user: userData };
      }
      return { success: false, message: res.message || 'Login failed' };
    } catch (err) {
      return { success: false, message: err.message, errors: err.errors };
    }
  };

  const register = async (userData) => {
    try {
      const res = await authService.register(userData);
      return { success: res.success, message: res.message, data: res.data };
    } catch (err) {
      return { success: false, message: err.message, errors: err.errors };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await authService.logout().catch(() => {});
      }
    } finally {
      localStorage.removeItem('bookswap_token');
      setToken(null);
      setUser(null);
    }
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshProfile,
        isAuthenticated: !!user && user.status === 'active',
        isPending: !!user && user.status === 'pending',
        isAdmin: user?.role === 'admin',
        isStaff: user?.role === 'staff' || user?.role === 'admin',
        isCustomer: user?.role === 'customer',
      }}
    >
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
