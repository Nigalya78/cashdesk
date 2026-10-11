'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import CashierHeader from '@/components/cashier/CashierHeader';
import { getMyShifts, getShiftEntries, getShiftCashOuts } from '@/lib/cashierApi';
import { getApiErrorMessage } from '@/lib/api';
import { formatRupees, formatDate, formatTime } from '@/lib/format';
import { Shift, Entry, CashOut } from '@/types';
import {
  IconClock, IconChevronDown, IconChevronUp, IconCalendar,
} from '@/components/ui/Icon';

function todayStr() { return new Date().toISOString().split('T')[0]; }

interface ShiftDetail {
  entries: Entry[];
  cashOuts: CashOut[];
}

export default function MyDataPage() {
  const [fromDate,   setFromDate]   = useState(todayStr());
  const [toDate,     setToDate]     = useState(todayStr());
  const [shifts,     setShifts]     = useState<Shift[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [hasLoaded,  setHasLoaded]  = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailMap,  setDetailMap]  = useState<Record<string, ShiftDetail>>({});
  const [loadingId,  setLoadingId]  = useState<string | null>(null);

  const handleView = useCallback(async () => {
    if (!fromDate || !toDate) { toast.error('Select both dates.'); return; }
    if (fromDate > toDate)    { toast.error('From date must be ≤ To date.'); return; }
    setLoading(true);
    try {
      const data = await getMyShifts(fromDate, toDate);
      setShifts(data);
      setHasLoaded(true);
      setExpandedId(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  // Auto-load today's data on mount
  useEffect(() => { handleView(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleShift(shiftId: string) {
    if (expandedId === shiftId) { setExpandedId(null); return; }
    setExpandedId(shiftId);
    if (!detailMap[shiftId]) {
      setLoadingId(shiftId);
      try {
        const [entries, cashOuts] = await Promise.all([
          getShiftEntries(shiftId),
          getShiftCashOuts(shiftId),
        ]);
        setDetailMap((prev) => ({ ...prev, [shiftId]: { entries, cashOuts } }));
      } catch (err) {
        toast.error(getApiErrorMessage(err));
      } finally {
        setLoadingId(null);
      }
    }
  }

  // Range totals across all loaded shifts
  const totals = shifts.reduce(
    (a, s) => ({
      cash_in:  a.cash_in  + Number(s.opening_cash_in) + Number(s.total_entries_cash),
      cash_out: a.cash_out + Number(s.total_cash_out),
      balance:  a.balance  + Number(s.cash_balance),
      card:     a.card     + Number(s.total_card),
    }),
    { cash_in: 0, cash_out: 0, balance: 0, card: 0 }
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <CashierHeader title="My Data" showBack backHref="/cashier/shift" />

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3"
           style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>

        {/* ── Date filter ───────────────────────────────────────────────── */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-1.5">
            <IconCalendar size={13} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Date Range</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
              <input type="date" value={fromDate} max={toDate}
                onChange={(e) => setFromDate(e.target.value)} className="input text-xs" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
              <input type="date" value={toDate} min={fromDate}
                onChange={(e) => setToDate(e.target.value)} className="input text-xs" />
            </div>
          </div>
          <button onClick={handleView} disabled={loading} className="c-btn-primary py-2.5 text-xs">
            {loading
              ? <><span className="spinner !border-white/30 !border-t-white" /> Loading…</>
              : 'View'
            }
          </button>
        </div>

        {/* ── Range summary ─────────────────────────────────────────────── */}
        {hasLoaded && shifts.length > 0 && (
          <div className="bg-gray-900 text-white rounded-xl p-4">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {formatDate(fromDate)} – {formatDate(toDate)}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <RangeStat label="Cash In"  value={formatRupees(totals.cash_in)}  />
              <RangeStat label="Cash Out" value={formatRupees(totals.cash_out)} />
              <RangeStat label="Balance"  value={formatRupees(totals.balance)}  highlight />
              <RangeStat label="Card"     value={formatRupees(totals.card)}     />
            </div>
          </div>
        )}

        {/* ── Empty ─────────────────────────────────────────────────────── */}
        {hasLoaded && shifts.length === 0 && (
          <div className="card p-8 text-center">
            <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <IconClock size={15} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">No shifts in this range</p>
            <p className="text-xs text-gray-400 mt-1">Try a different date range.</p>
          </div>
        )}

        {/* ── Shift cards ───────────────────────────────────────────────── */}
        {shifts.map((shift) => {
          const isOpen     = expandedId === shift.id;
          const detail     = detailMap[shift.id];
          const isFetching = loadingId === shift.id;
          const totalCashIn = Number(shift.opening_cash_in) + Number(shift.total_entries_cash);

          return (
            <div key={shift.id} className="card overflow-hidden">
              <button onClick={() => toggleShift(shift.id)}
                className="w-full text-left p-4 hover:bg-gray-50/60 transition-colors">

                {/* Shift date + time */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatDate(shift.shift_date)} ({formatTime(shift.login_time)}{shift.end_time ? ` – ${formatTime(shift.end_time)}` : ''})
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      {shift.status === 'active' ? '· Active' : `· ${shift.entry_count} entr${shift.entry_count !== 1 ? 'ies' : 'y'}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={shift.status === 'active' ? 'badge-active' : 'badge-completed'}>
                      {shift.status === 'active' ? 'Active' : 'Done'}
                    </span>
                    <span className="text-gray-300">
                      {isOpen ? <IconChevronUp size={14}/> : <IconChevronDown size={14}/>}
                    </span>
                  </div>
                </div>

                {/* Mini totals */}
                <div className="grid grid-cols-4 gap-1">
                  <MiniTotal label="In"      value={formatRupees(totalCashIn)}           color="text-emerald-700" />
                  <MiniTotal label="Out"     value={formatRupees(shift.total_cash_out)}  color="text-red-500"     />
                  <MiniTotal label="Balance" value={formatRupees(shift.cash_balance)}    color="text-blue-700"    />
                  <MiniTotal label="Card"    value={formatRupees(shift.total_card)}       color="text-violet-600"  />
                </div>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-gray-100">
                  {isFetching ? (
                    <div className="flex justify-center py-5"><div className="spinner" /></div>
                  ) : (
                    <div className="divide-y divide-gray-50">

                      {/* Opening Cash In */}
                      <div className="px-4 py-3 bg-emerald-50/40">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Opening Float</p>
                        <p className="text-sm font-bold text-emerald-700 tabular-nums">
                          {formatRupees(shift.opening_cash_in)}
                        </p>
                      </div>

                      {/* Named entries */}
                      {detail && detail.entries.length > 0 && (
                        <div className="px-4 py-3">
                          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                            Entries ({detail.entries.length})
                          </p>
                          <div className="space-y-2">
                            {detail.entries.map((entry) => (
                              <div key={entry.id} className="bg-white rounded-lg p-3 border border-gray-100">
                                <p className="text-xs font-semibold text-gray-800 mb-1.5">
                                  {entry.entry_name?.trim()
                                    ? entry.entry_name
                                    : `Entry at ${formatTime(entry.created_at)}`}
                                </p>
                                {entry.denominations.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {entry.denominations.map((d) => (
                                      <span key={d.id}
                                        className="text-[10px] bg-blue-50 text-blue-700 ring-1 ring-blue-100 px-1.5 py-0.5 rounded tabular-nums">
                                        ₹{d.denomination}×{d.quantity}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div className="grid grid-cols-2 gap-1 text-xs">
                                  <div>
                                    <p className="text-gray-400">Cash</p>
                                    <p className="font-semibold text-emerald-700 tabular-nums">{formatRupees(entry.cash_in)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Card</p>
                                    <p className="font-semibold text-violet-600 tabular-nums">{formatRupees(entry.card_amount)}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Cash outs */}
                      {detail && detail.cashOuts.length > 0 && (
                        <div className="px-4 py-3">
                          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                            Cash Outs ({detail.cashOuts.length})
                          </p>
                          <div className="space-y-1.5">
                            {detail.cashOuts.map((co) => (
                              <div key={co.id} className="flex items-center justify-between bg-red-50/50 rounded-lg px-3 py-2">
                                <p className="text-xs text-gray-600 truncate flex-1">{co.note}</p>
                                <p className="text-xs font-semibold text-red-600 tabular-nums ml-2 flex-shrink-0">{formatRupees(co.amount)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {detail && detail.entries.length === 0 && detail.cashOuts.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-5">No entries recorded.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RangeStat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-gray-500 mb-0.5">{label}</p>
      <p className={`tabular-nums font-bold ${highlight ? 'text-lg text-white' : 'text-sm text-gray-300'}`}>{value}</p>
    </div>
  );
}

function MiniTotal({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
      <p className={`text-[11px] font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
