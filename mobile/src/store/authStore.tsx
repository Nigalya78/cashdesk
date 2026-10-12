import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import api, { TOKEN_KEY } from '../services/api';
import { User, Shift, ApiResponse } from '../types';
import { getActiveShift } from '../services/cashierApi';

interface LoginResult {
  token: string;
  user: User;
  activeShiftId: string | null;
}

interface AuthContextValue {
  user: User | null;
  activeShift: Shift | null;
  isAuthenticated: boolean;
  isLoading: boolean;   // true while restoring session on startup
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setActiveShift: (shift: Shift | null) => void;
  refreshShift: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,        setUser]        = useState<User | null>(null);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [isLoading,   setIsLoading]   = useState(true); // starts true

  // ── Restore session on startup ────────────────────────────────────────────
  useEffect(() => {
    async function restore() {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) { setIsLoading(false); return; }

        // Token exists — verify it with a short timeout so startup is never blocked
        try {
          const res = await api.get<ApiResponse<User>>('/auth/me', { timeout: 4000 });
          if (res.data.success && res.data.data) {
            setUser(res.data.data);
            // Try to load active shift
            const shift = await getActiveShift();
            setActiveShift(shift);
          } else {
            // Server returned a non-success response — token is invalid, clear it
            await SecureStore.deleteItemAsync(TOKEN_KEY);
          }
        } catch (err: unknown) {
          // Only delete the token on an explicit 401/403 — keep it on network errors
          const status = axios.isAxiosError(err) ? err.response?.status : undefined;
          if (status === 401 || status === 403) {
            try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch {}
          }
          // Network error: leave token intact; user stays authenticated-but-offline
          // (isAuthenticated stays false since user is null, but token is preserved)
        }
      } catch {
        // Unexpected error reading from SecureStore — do not clear token
      } finally {
        setIsLoading(false);
      }
    }
    restore();
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post<ApiResponse<LoginResult>>('/auth/login', { username, password });

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Login failed.');
    }

    const data = res.data.data;
    if (data.user.role !== 'cashier') {
      throw new Error('This app is for cashiers only.');
    }

    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    setUser(data.user);
    // Do NOT open a shift here — the StartShift screen handles that
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch {}
    setUser(null);
    setActiveShift(null);
  }, []);

  // ── Refresh shift ─────────────────────────────────────────────────────────
  const refreshShift = useCallback(async () => {
    try {
      const s = await getActiveShift();
      setActiveShift(s);
    } catch {}
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      activeShift,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      setActiveShift,
      refreshShift,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
