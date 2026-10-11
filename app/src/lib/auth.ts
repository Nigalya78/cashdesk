import Cookies from 'js-cookie';
import api, { getApiErrorMessage } from './api';
import { User, ApiResponse } from '../types';

const TOKEN_KEY = 'cashdesk_token';
const USER_KEY  = 'cashdesk_user';

export interface LoginResult {
  token: string;
  user: User;
  activeShiftId: string | null;
}

/**
 * Login for cashiers. Role is verified client-side after server response.
 */
export async function loginUser(username: string, password: string): Promise<LoginResult> {
  const res = await api.post<ApiResponse<LoginResult>>('/auth/login', { username, password });
  const data = res.data.data!;

  // Cookie expires in 30 days — matches JWT_EXPIRES_IN, no fixed shift limit
  Cookies.set(TOKEN_KEY, data.token, { expires: 30, sameSite: 'strict' });
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));

  return data;
}

export function logout(): void {
  Cookies.remove(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return Cookies.get(TOKEN_KEY) || null;
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function getStoredRole(): string | null {
  return getStoredUser()?.role ?? null;
}
