import { useState, useEffect } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
}

export const useAuth = (): AuthState => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: true, // For demo purposes, always authenticated
    isLoading: false,
    user: { name: 'Demo User', email: 'demo@nodeguard.ai' },
  });

  useEffect(() => {
    // Simulate auth check
    const checkAuth = async () => {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: { name: 'Demo User', email: 'demo@nodeguard.ai' },
      });
    };

    checkAuth();
  }, []);

  return authState;
};
