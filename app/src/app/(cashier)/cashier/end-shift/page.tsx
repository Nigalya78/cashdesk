'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import CashierHeader from '@/components/cashier/CashierHeader';
import { getActiveShift, endShift } from '@/lib/cashierApi';
import { getApiErrorMessage } from '@/lib/api';
import { logout } from '@/lib/auth';
import { formatRupees, formatTime, formatDate } from '@/lib/format';
import { Shift } from '@/types';
import {
  IconAlertTriangle, IconCheck, IconClock,
  IconTrendingUp, IconTrendingDown, IconWallet, IconCreditCard,
} from '@/components/ui/Icon';

type Step = 'confirm' | 'ending' | 'done';

export default function EndShiftPage() {
  const router = useRouter();

  const [shift,     setShift]     = useState<Shift | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [step,      setStep]      = useState<Step>('confirm');
  const [completed, setCompleted] = useState<Shift | null>(null);

  useEffect(() => {
    getActiveShift()
      .then((s) => {
        if (!s) { toast.error('No active shift found.'); router.push('/cashier/shift'); return; }
        setShift(s);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        toast.error(getApiErrorMessage(err));
        router.push('/cashier/shift');
      });
  }, [router]);

  async function handleEnd() {
    if (!shift) return;
    setStep('ending');
    try {
      const done = await endShift(shift.id);
      setCompleted(done);
      setStep('done');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
      setStep('confirm');
    }
  }

  function handleFinish() {
    logout();
    router.push('/login');
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner-lg" />
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (step === 'done' && completed) {
    // Total cash in = opening float + entries cash
    const totalCashIn = Number(completed.opening_cash_in) + Number(completed.total_entries_cash);

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <CashierHeader title="Shift Completed" />
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-4"
           style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>

          <div className="card p-6 flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-1">
              <IconCheck size={22} />
            </div>
            <p className="text-base font-bold text-gray-900">Shift Ended</p>
            <p className="text-xs text-gray-400">
              {formatDate(completed.shift_date)} · {formatTime(completed.login_time)}
              {completed.end_time ? ` – ${formatTime(completed.end_time)}` : ''}
            </p>
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Final Summary</p>
            </div>
            <div className="p-4 space-y-2.5">
              <FinalRow icon={<IconTrendingUp  size={13}/>} label="Opening Float"
                value={formatRupees(completed.opening_cash_in)} color="text-emerald-700" />
              <FinalRow icon={<IconTrendingUp  size={13}/>} label="Entries Cash"
                value={formatRupees(completed.total_entries_cash)} color="text-emerald-600" />
              <FinalRow icon={<IconCreditCard  size={13}/>} label="Card"
                value={formatRupees(completed.total_card)} color="text-violet-600" />
              <FinalRow icon={<IconTrendingDown size={13}/>} label="Cash Out"
                value={formatRupees(completed.total_cash_out)} color="text-red-500" />
              <div className="divider" />
              <FinalRow icon={<IconWallet size={13}/>} label="Cash Balance"
                value={formatRupees(completed.cash_balance)} color="text-blue-700" bold />
              <div className="divider" />
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <IconClock size={11} className="text-gray-400" /> Entries
                </span>
                <span className="font-semibold text-gray-700">{completed.entry_count}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Cash Outs</span>
                <span className="font-semibold text-gray-700">{completed.cash_out_count}</span>
              </div>
            </div>
          </div>

          <button onClick={handleFinish} className="c-btn-primary mt-auto">Done</button>
        </div>
      </div>
    );
  }

  // ── Confirm ────────────────────────────────────────────────────────────────
  const totalCashIn = Number(shift?.opening_cash_in ?? 0) + Number(shift?.total_entries_cash ?? 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <CashierHeader title="End Shift" showBack backHref="/cashier/shift" />

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 flex flex-col gap-4"
           style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>

        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Shift Summary</p>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <IconClock size={10} className="text-gray-300" />
                Started {formatTime(shift?.login_time)}
              </p>
            </div>
            <span className="badge-active">Active</span>
          </div>
          <div className="p-4 space-y-2.5">
            <FinalRow icon={<IconTrendingUp  size={13}/>} label="Opening Float"
              value={formatRupees(shift?.opening_cash_in ?? 0)} color="text-emerald-700" />
            <FinalRow icon={<IconTrendingUp  size={13}/>} label="Entries Cash"
              value={formatRupees(shift?.total_entries_cash ?? 0)} color="text-emerald-600" />
            <FinalRow icon={<IconCreditCard  size={13}/>} label="Card"
              value={formatRupees(shift?.total_card ?? 0)} color="text-violet-600" />
            <FinalRow icon={<IconTrendingDown size={13}/>} label="Cash Out"
              value={formatRupees(shift?.total_cash_out ?? 0)} color="text-red-500" />
            <div className="divider" />
            <FinalRow icon={<IconWallet size={13}/>} label="Balance"
              value={formatRupees(shift?.cash_balance ?? 0)} color="text-blue-700" bold />
            <div className="divider" />
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Entries</span>
              <span className="font-semibold text-gray-700">{shift?.entry_count ?? 0}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Cash Outs</span>
              <span className="font-semibold text-gray-700">{shift?.cash_out_count ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <IconAlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            Ending your shift will <strong>log you out</strong> and lock all entries.
            This cannot be undone.
          </p>
        </div>

        <p className="text-sm font-semibold text-gray-700 text-center">
          Are you sure you want to end your shift?
        </p>

        <div className="flex flex-col gap-2 mt-auto">
          <button onClick={handleEnd} disabled={step === 'ending'} className="c-btn-danger">
            {step === 'ending'
              ? <><span className="spinner !border-white/30 !border-t-white" /> Ending Shift…</>
              : 'End Shift & Log Out'
            }
          </button>
          <button onClick={() => router.push('/cashier/shift')}
            disabled={step === 'ending'} className="c-btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function FinalRow({ icon, label, value, color, bold = false }: {
  icon: React.ReactNode; label: string; value: string; color: string; bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`flex items-center gap-1.5 text-xs text-gray-500 ${bold ? 'font-semibold' : ''}`}>
        <span className={color}>{icon}</span>{label}
      </span>
      <span className={`tabular-nums ${bold ? 'text-sm font-bold' : 'text-xs font-semibold'} ${color}`}>
        {value}
      </span>
    </div>
  );
}
