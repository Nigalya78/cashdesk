'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import CashierHeader from '@/components/cashier/CashierHeader';
import { openShift, getMyShifts } from '@/lib/cashierApi';
import { getApiErrorMessage } from '@/lib/api';
import { logout, getStoredUser } from '@/lib/auth';
import { getGreeting, formatDate, formatRupees } from '@/lib/format';
import { Shift } from '@/types';

export default function StartShiftPage() {
  const router = useRouter();
  const user = getStoredUser();

  const [starting,    setStarting]    = useState(false);
  const [prevShift,   setPrevShift]   = useState<Shift | null>(null);
  const [prevLoading, setPrevLoading] = useState(true);

  // Load previous completed shift on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const shifts = await getMyShifts();
        if (!cancelled) {
          const completed = shifts.find((s) => s.status === 'completed') ?? null;
          setPrevShift(completed);
        }
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setPrevLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleStartShift() {
    setStarting(true);
    try {
      await openShift();
      router.push('/cashier/shift');
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err);
      if (msg.toLowerCase().includes('already have an active shift')) {
        // Shift already open — just navigate
        router.push('/cashier/shift');
      } else {
        toast.error(msg);
        setStarting(false);
      }
    }
  }

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const greeting = getGreeting(user?.name ?? '');
  const dateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <CashierHeader />

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-5"
           style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>

        {/* Greeting */}
        <div className="pt-2">
          <p className="text-xl font-bold text-gray-900">{greeting}</p>
          <p className="text-xs text-gray-400 mt-1">{dateStr}</p>
        </div>

        {/* Start Shift */}
        <button
          onClick={handleStartShift}
          disabled={starting}
          className="c-btn-primary w-full flex items-center justify-center gap-2 py-4 text-base"
        >
          {starting
            ? <><span className="spinner !border-white/30 !border-t-white" /> Starting…</>
            : '▶ Start Shift'
          }
        </button>

        {/* My Data */}
        <button
          onClick={() => router.push('/cashier/my-data')}
          className="c-btn-secondary w-full"
        >
          My Data
        </button>

        {/* Previous Shift Card */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Previous Shift</p>
          </div>
          <div className="p-4">
            {prevLoading ? (
              <div className="flex justify-center py-4">
                <div className="spinner-lg" />
              </div>
            ) : prevShift ? (
              <div className="space-y-2.5">
                <p className="text-sm font-semibold text-gray-700 mb-1">{formatDate(prevShift.shift_date)}</p>
                <div className="divider" />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Cash Balance</span>
                  <span className="text-sm font-bold text-blue-700 tabular-nums">
                    {formatRupees(prevShift.cash_balance)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Entries</span>
                  <span className="text-xs font-semibold text-gray-700">{prevShift.entry_count ?? 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Cash Outs</span>
                  <span className="text-xs font-semibold text-gray-700">{prevShift.cash_out_count ?? 0}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">No previous shifts</p>
            )}
          </div>
        </div>

        {/* Logout */}
        <div className="flex justify-center mt-auto pt-2">
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-4 py-2"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
