import axios, { AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';
export const TOKEN_KEY = 'cashdesk_jwt';

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
// Note: interceptor must return the config synchronously or return a Promise
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // SecureStore unavailable — proceed without token
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = (error as AxiosError<{ message?: string; errors?: string[] }>).response?.data;
    if (data?.errors?.length) return data.errors.join(' ');
    if (data?.message) return data.message;
    if (error.code === 'ECONNABORTED') return 'Request timed out. Check your connection.';
    if (!error.response) return 'Network error. Make sure the server is running.';
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}

export async function registerUser(name: string, username: string, password: string): Promise<void> {
  await api.post('/auth/register', { name, username, password });
}
