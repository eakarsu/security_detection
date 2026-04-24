import { useState, useEffect } from 'react';
import { authStorage } from '../services/storage';
import { User, AuthState } from '../types';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: true,
  });

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const [token, user] = await Promise.all([
        authStorage.getToken(),
        authStorage.getUser(),
      ]);

      setAuthState({
        isAuthenticated: !!(token && user),
        user,
        token,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error checking auth state:', error);
      setAuthState({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
      });
    }
  };

  const login = async (user: User, token: string) => {
    try {
      await authStorage.saveToken(token);
      await authStorage.saveUser(user);
      
      setAuthState({
        isAuthenticated: true,
        user,
        token,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authStorage.clearAuthData();
      
      setAuthState({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const updateUser = async (updatedUser: User) => {
    try {
      await authStorage.saveUser(updatedUser);
      
      setAuthState(prevState => ({
        ...prevState,
        user: updatedUser,
      }));
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  return {
    ...authState,
    login,
    logout,
    updateUser,
    refreshAuth: checkAuthState,
  };
};