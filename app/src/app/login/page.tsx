'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { loginUser } from '@/lib/auth';
import { getApiErrorMessage } from '@/lib/api';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);
  const [status,   setStatus]   = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    try {
      // 1. Authenticate
      setStatus('Signing in…');
      const result = await loginUser(username.trim(), password);

      if (result.user.role !== 'cashier') {
        toast.error('This app is for cashiers only.');
        return;
      }

      // 2. Start shift (or resume existing one)
      setStatus('Starting shift…');
      try {
        await api.post('/cashier/shifts');
      } catch (shiftErr) {
        // "already have an active shift" → fine, just resume
        const msg = getApiErrorMessage(shiftErr);
        if (!msg.toLowerCase().includes('already have an active shift')) {
          throw shiftErr; // unexpected error — rethrow
        }
      }

      // 3. Go straight to shift page
      router.push('/cashier/shift');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
      setStatus('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4"
         style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Brand */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-3">
          <span className="text-white font-bold text-xl leading-none">₹</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">CashDesk</h1>
        <p className="text-sm text-gray-400 mt-1">Sign in to start your shift</p>
      </div>

      {/* Form card */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label htmlFor="username"
              className="block text-xs font-semibold text-gray-600 mb-1.5">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              autoFocus
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              placeholder="Enter your username"
              className="input"
            />
          </div>

          <div>
            <label htmlFor="password"
              className="block text-xs font-semibold text-gray-600 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="Enter your password"
                className="input pr-14"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2
                           text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPwd ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="w-full c-btn-primary mt-1"
          >
            {loading
              ? <><span className="spinner !border-white/30 !border-t-white" /> {status}</>
              : 'Sign In'
            }
          </button>
        </form>
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center">
        Contact your manager if you have trouble signing in.
      </p>
    </div>
  );
}
