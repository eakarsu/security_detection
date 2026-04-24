import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ENDPOINTS } from '../config/api.ts';
import type { User, AuthResponse } from '../types/index.ts';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; first_name: string; last_name: string; role?: string }) => Promise<{ message: string }>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const TOKEN_KEY = 'nodeguard_token';
const USER_KEY = 'nodeguard_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check token validity on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);

      if (!token || !savedUser) {
        setIsLoading(false);
        return;
      }

      try {
        // Verify token by fetching profile
        const response = await fetch(ENDPOINTS.authProfile(), {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const profile = await response.json();
          setUser(profile);
          localStorage.setItem(USER_KEY, JSON.stringify(profile));
        } else {
          // Token invalid, clear storage
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
      } catch {
        // Network error - use cached user data
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(ENDPOINTS.authLogin(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Invalid email or password');
    }

    const data: AuthResponse = await response.json();
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const register = useCallback(async (data: { email: string; password: string; first_name: string; last_name: string; role?: string }) => {
    const response = await fetch(ENDPOINTS.authRegister(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Registration failed');
    }

    return response.json();
  }, []);

  const logout = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        await fetch(ENDPOINTS.authLogout(), {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      } catch {
        // Logout even if API call fails
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        isLoading,
        user,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
