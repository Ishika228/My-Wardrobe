import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  loginUser as apiLogin,
  registerUser as apiRegister,
  logoutUser as apiLogout,
  isLoggedIn as checkLoggedIn,
  getCurrentUser,
  healthCheck,
} from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState(checkLoggedIn());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendOnline, setBackendOnline] = useState(null);

  // Check backend health on mount
  useEffect(() => {
    healthCheck().then(setBackendOnline);
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiLogin(email, password);
      if (result.success) {
        setUser(result.data.user);
        setIsAuthenticated(true);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (name, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRegister(name, email, password);
      if (result.success) {
        setUser(result.data.user);
        setIsAuthenticated(true);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        error,
        backendOnline,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
