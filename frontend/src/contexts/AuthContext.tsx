import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import type { User, LoginRequest, RegisterRequest } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const error = urlParams.get('error');
    const redirect = urlParams.get('redirect');

    if (accessToken && refreshToken) {
      // OAuth callback - store tokens and load user
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      loadUser().then(() => {
        // Redirect to specified URL or dashboard after successful OAuth login
        if (window.location.pathname === '/auth/callback') {
          const redirectTo = redirect ? decodeURIComponent(redirect) : '/dashboard';
          window.location.href = redirectTo;
        }
      });
    } else if (error) {
      // OAuth error - just set loading to false
      setLoading(false);
    } else {
      // Check if user is already logged in
      const token = localStorage.getItem('access_token');
      if (token) {
        loadUser();
      } else {
        setLoading(false);
      }
    }
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await api.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginRequest) => {
    const authResponse = await api.login(credentials);
    localStorage.setItem('access_token', authResponse.access_token);
    localStorage.setItem('refresh_token', authResponse.refresh_token);
    await loadUser();
  };

  const register = async (data: RegisterRequest) => {
    await api.register(data);
    // Auto-login after registration
    await login({ email: data.email, password: data.password });
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    // Clear legacy onboarding data (now stored server-side)
    localStorage.removeItem('mosaic_onboarding');
    // Clear organization selection (user-specific)
    localStorage.removeItem('current_organization_id');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const currentUser = await api.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
