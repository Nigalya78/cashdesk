'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import CashierHeader from '@/components/cashier/CashierHeader';
import DenominationGrid, {
  DenomEntry, initDenomEntries, computeCashTotal,
} from '@/components/cashier/DenominationGrid';
import { DecimalInput } from '@/components/ui/NumberInput';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  getActiveShift, updateCashIn,
  createEntry, updateEntry, deleteEntry, getShiftEntries,
  createCashOut, updateCashOut, deleteCashOut, getShiftCashOuts,
  addCashInReturn, deleteCashInReturn, getCashInReturnsForShift,
  DenominationInput,
} from '@/lib/cashierApi';
import { getApiErrorMessage } from '@/lib/api';
import { formatRupees, formatTime, formatDate } from '@/lib/format';
import { Shift, Entry, CashOut, CashInReturn } from '@/types';
import {
  IconTrendingUp, IconTrendingDown, IconCreditCard,
  IconPlus, IconEdit, IconCheck, IconAlertTriangle,
  IconClock, IconChevronDown, IconChevronUp,
} from '@/components/ui/Icon';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(name: string): string {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${g}, ${name}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShiftPage() {
  const router = useRouter();

  // ── Shift state ────────────────────────────────────────────────────────────
  const [shift,     setShift]     = useState<Shift | null>(null);
  const [loading,   setLoading]   = useState(true);

  // ── Cash In state ──────────────────────────────────────────────────────────
  const [cashInAmount,   setCashInAmount]   = useState('');
  const [cashInEditing,  setCashInEditing]  = useState(false);
  const [cashInSaving,   setCashInSaving]   = useState(false);

  // ── Entry form state ───────────────────────────────────────────────────────
  const [entryName,      setEntryName]      = useState('');
  const [denomEntries,   setDenomEntries]   = useState<DenomEntry[]>(initDenomEntries());
  const [cardAmount,     setCardAmount]     = useState('');
  const [entrySaving,    setEntrySaving]    = useState(false);
  const [editingEntry,   setEditingEntry]   = useState<Entry | null>(null);

  // ── Saved entries list ─────────────────────────────────────────────────────
  const [entries,        setEntries]        = useState<Entry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [expandedEntry,  setExpandedEntry]  = useState<string | null>(null);

  // ── Cash Out form state ────────────────────────────────────────────────────
  const [cashOutAmount,  setCashOutAmount]  = useState('');
  const [cashOutNote,    setCashOutNote]    = useState('');
  const [cashOutSaving,  setCashOutSaving]  = useState(false);
  const [editingCashOut, setEditingCashOut] = useState<CashOut | null>(null);

  // ── Saved cash outs list ───────────────────────────────────────────────────
  const [cashOuts,       setCashOuts]       = useState<CashOut[]>([]);

  // ── Cash In Returns state ──────────────────────────────────────────────────
  const [cashInReturns,  setCashInReturns]  = useState<Record<string, CashInReturn[]>>({});
  const [showReturnForm, setShowReturnForm] = useState<string | null>(null);
  const [returnAmount,   setReturnAmount]   = useState('');
  const [returnNote,     setReturnNote]     = useState('');
  const [returnSaving,   setReturnSaving]   = useState(false);

  // ── Confirm modal ──────────────────────────────────────────────────────────
  const [confirmModal, setConfirmModal] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const cashTotal = computeCashTotal(denomEntries);

  // ── Load shift + entries + cash outs ───────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const s = await getActiveShift();
      if (!s) { router.push('/cashier/start-shift'); return; }
      setShift(s);
      setCashInAmount(s.opening_cash_in !== null && s.opening_cash_in !== undefined ? String(s.opening_cash_in) : '');
      setLoading(false);

      const [ent, outs] = await Promise.all([
        getShiftEntries(s.id),
        getShiftCashOuts(s.id),
      ]);
      setEntries(ent);
      setCashOuts(outs);
      const returns = await getCashInReturnsForShift(s.id);
      const returnMap: Record<string, CashInReturn[]> = {};
      returns.forEach((r) => {
        if (!returnMap[r.cash_out_id]) returnMap[r.cash_out_id] = [];
        returnMap[r.cash_out_id].push(r);
      });
      setCashInReturns(returnMap);
    } catch (err) {
      setLoading(false);
      toast.error(getApiErrorMessage(err));
    }
  }, [router]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Reload shift summary (totals) ─────────────────────────────────────────
  const refreshShift = useCallback(async () => {
    const s = await getActiveShift();
    if (s) setShift(s);
  }, []);

  // ── Cash In ────────────────────────────────────────────────────────────────
  async function handleSaveCashIn() {
    if (!shift) return;
    const amt = parseFloat(cashInAmount);
    if (isNaN(amt) || amt < 0) { toast.error('Enter a valid amount.'); return; }
    setCashInSaving(true);
    try {
      const updated = await updateCashIn(shift.id, amt);
      setShift(updated);
      setCashInEditing(false);
      toast.success('Cash In saved.');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setCashInSaving(false);
    }
  }

  // ── Entry form ─────────────────────────────────────────────────────────────
  function resetEntryForm() {
    setEntryName('');
    setDenomEntries(initDenomEntries());
    setCardAmount('');
    setEditingEntry(null);
  }

  function startEditEntry(entry: Entry) {
    setEditingEntry(entry);
    setEntryName(entry.entry_name);
    setCardAmount(entry.card_amount > 0 ? String(entry.card_amount) : '');
    setDenomEntries(initDenomEntries().map((e) => {
      const f = entry.denominations.find((d) => d.denomination === e.denomination);
      return f ? { ...e, quantity: String(f.quantity) } : e;
    }));
    // Scroll to form
    document.getElementById('entry-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleSaveEntry() {
    if (!shift) return;
    if (!entryName.trim()) { toast.error('Entry name is required.'); return; }
    const card = parseFloat(cardAmount) || 0;
    if (cashTotal === 0 && card === 0) {
      toast.error('Enter at least one denomination or card amount.'); return;
    }

    const denoms: DenominationInput[] = denomEntries
      .filter((e) => (parseInt(e.quantity) || 0) > 0)
      .map((e) => ({ denomination: e.denomination, quantity: parseInt(e.quantity) }));

    setEntrySaving(true);
    try {
      if (editingEntry) {
        const allDenoms: DenominationInput[] = denomEntries.map((e) => ({
          denomination: e.denomination, quantity: parseInt(e.quantity) || 0,
        }));
        const updated = await updateEntry(editingEntry.id, entryName.trim(), allDenoms, card);
        setEntries((prev) => prev.map((e) => e.id === updated.id ? updated : e));
        toast.success('Entry updated.');
      } else {
        const created = await createEntry(shift.id, entryName.trim(), denoms, card);
        setEntries((prev) => [...prev, created]);
        toast.success('Entry saved.');
      }
      resetEntryForm();
      await refreshShift();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setEntrySaving(false);
    }
  }

  async function handleDeleteEntry(entryId: string) {
    setConfirmModal({
      message: 'Are you sure you want to delete this entry? This cannot be undone.',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await deleteEntry(entryId);
          setEntries((prev) => prev.filter((e) => e.id !== entryId));
          await refreshShift();
          toast.success('Entry deleted.');
        } catch (err) {
          toast.error(getApiErrorMessage(err));
        }
      },
    });
  }

  // ── Cash Out form ──────────────────────────────────────────────────────────
  function resetCashOutForm() {
    setCashOutAmount('');
    setCashOutNote('');
    setEditingCashOut(null);
  }

  function startEditCashOut(co: CashOut) {
    setEditingCashOut(co);
    setCashOutAmount(String(co.amount));
    setCashOutNote(co.note);
    document.getElementById('cashout-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleSaveCashOut() {
    if (!shift) return;
    const amt = parseFloat(cashOutAmount);
    if (isNaN(amt) || amt <= 0) { toast.error('Enter a valid amount.'); return; }
    if (!cashOutNote.trim()) { toast.error('Note is required.'); return; }

    setCashOutSaving(true);
    try {
      if (editingCashOut) {
        const updated = await updateCashOut(editingCashOut.id, amt, cashOutNote.trim());
        setCashOuts((prev) => prev.map((c) => c.id === updated.id ? updated : c));
        toast.success('Cash out updated.');
      } else {
        const created = await createCashOut(shift.id, amt, cashOutNote.trim());
        setCashOuts((prev) => [...prev, created]);
        toast.success('Cash out saved.');
      }
      resetCashOutForm();
      await refreshShift();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setCashOutSaving(false);
    }
  }

  async function handleDeleteCashOut(cashOutId: string) {
    setConfirmModal({
      message: 'Are you sure you want to delete this cash out? This cannot be undone.',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await deleteCashOut(cashOutId);
          setCashOuts((prev) => prev.filter((c) => c.id !== cashOutId));
          await refreshShift();
          toast.success('Cash out deleted.');
        } catch (err) {
          toast.error(getApiErrorMessage(err));
        }
      },
    });
  }

  // ── Cash In Returns ────────────────────────────────────────────────────────
  async function handleSaveReturn(cashOutId: string) {
    if (!shift) return;
    const amt = parseFloat(returnAmount);
    if (isNaN(amt) || amt <= 0) { toast.error('Enter a valid amount.'); return; }
    setReturnSaving(true);
    try {
      const created = await addCashInReturn(cashOutId, shift.id, amt, returnNote.trim());
      setCashInReturns((prev) => ({
        ...prev,
        [cashOutId]: [...(prev[cashOutId] ?? []), created],
      }));
      setShowReturnForm(null);
      setReturnAmount('');
      setReturnNote('');
      await refreshShift();
      toast.success('Return added.');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setReturnSaving(false);
    }
  }

  async function handleDeleteReturn(returnId: string, cashOutId: string) {
    setConfirmModal({
      message: 'Delete this cash in return?',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await deleteCashInReturn(returnId);
          setCashInReturns((prev) => ({
            ...prev,
            [cashOutId]: (prev[cashOutId] ?? []).filter((r) => r.id !== returnId),
          }));
          await refreshShift();
          toast.success('Return deleted.');
        } catch (err) {
          toast.error(getApiErrorMessage(err));
        }
      },
    });
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner-lg" />
      </div>
    );
  }

  const isActive = shift?.status === 'active';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <CashierHeader />

      {/* Confirm modal */}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-10 space-y-4"
           style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}>

        {/* Shift ended banner */}
        {!isActive && shift && (
          <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <IconAlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              This shift has ended. You can view entries below but cannot make changes.
            </p>
          </div>
        )}

        {/* ── Shift header ────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-base font-semibold text-gray-900">
              {getGreeting(shift?.cashier_name ?? '')}
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="badge-green flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                {isActive ? 'Shift Active' : 'Shift Ended'}
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <IconClock size={11} className="text-gray-300" />
                {formatDate(shift?.shift_date ?? '')} · Started {formatTime(shift?.login_time)}
              </span>
            </div>
          </div>
          <button
            onClick={() => loadAll()}
            title="Refresh"
            className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0 mt-0.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M8 16H3v5"/>
            </svg>
          </button>
        </div>

        {/* ── Balance summary strip ────────────────────────────────────── */}
        {/* Dashboard: Row 1 */}
        <div className="grid grid-cols-2 gap-2">
          <SummaryBox label="Opening Balance" value={formatRupees(shift?.opening_cash_in ?? 0)} color="emerald" />
          <SummaryBox label="Available Balance" value={formatRupees(shift?.cash_balance ?? 0)} color="blue" />
        </div>
        {/* Dashboard: Row 2 */}
        <div className="grid grid-cols-2 gap-2">
          <SummaryBox label="Cash Out" value={formatRupees(shift?.total_cash_out ?? 0)} color="red" />
          <SummaryBox label="Cash In" value={formatRupees(shift?.total_cash_in_returns ?? 0)} color="emerald" />
        </div>
        {/* Dashboard: Row 3 — net bar (only when cash_out > 0) */}
        {(shift?.total_cash_out ?? 0) > 0 && (
          <div className="bg-gray-100 rounded-xl px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">Net Cash Out</span>
            <span className="text-sm font-semibold text-gray-700 tabular-nums">
              {formatRupees(Math.max(0, (shift?.total_cash_out ?? 0) - (shift?.total_cash_in_returns ?? 0)))}
            </span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            SECTION 1 — CASH IN (opening float, once per shift)
        ══════════════════════════════════════════════════════════════ */}
        <section className="card overflow-hidden">
          <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconTrendingUp size={14} className="text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-900">Cash In</p>
              <span className="text-[10px] text-emerald-600/70">Opening float</span>
            </div>
            {isActive && !cashInEditing && (
              <button
                onClick={() => setCashInEditing(true)}
                className="text-xs text-emerald-700 hover:text-emerald-900 flex items-center gap-1 font-medium"
              >
                <IconEdit size={12} /> Edit
              </button>
            )}
          </div>

          <div className="p-4">
            {cashInEditing ? (
              <div className="space-y-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm pointer-events-none">₹</span>
                  <DecimalInput
                    min="0" value={cashInAmount}
                    onChange={(e) => setCashInAmount(e.target.value)}
                    placeholder="0.00"
                    className="input pl-7 text-xl font-bold"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveCashIn} disabled={cashInSaving}
                    className="btn-sm btn-primary flex-1">
                    {cashInSaving ? <><span className="spinner" /> Saving…</> : <><IconCheck size={13} /> Save</>}
                  </button>
                  <button onClick={() => { setCashInEditing(false); setCashInAmount(shift?.opening_cash_in ? String(shift.opening_cash_in) : ''); }}
                    className="btn-sm btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-2xl font-bold text-emerald-800 tabular-nums">
                  {shift?.opening_cash_in !== null && shift?.opening_cash_in !== undefined && Number(shift.opening_cash_in) >= 0
                    ? formatRupees(shift.opening_cash_in)
                    : <span className="text-gray-300">Not set</span>
                  }
                </p>
                {isActive && (shift?.opening_cash_in === null || shift?.opening_cash_in === undefined) && (
                  <button onClick={() => setCashInEditing(true)}
                    className="mt-2 text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1">
                    <IconPlus size={12} /> Enter opening float
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 2 — NAMED ENTRIES (denominations + card)
        ══════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <IconCreditCard size={14} className="text-blue-600" />
            <p className="text-sm font-semibold text-gray-800">Entries</p>
            <span className="text-[10px] text-gray-400">Denominations &amp; Card</span>
          </div>

          {/* Entry form */}
          {isActive && (
            <div id="entry-form" className="card p-4 space-y-3 mb-3 scroll-mt-14">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {editingEntry ? `Editing: ${editingEntry.entry_name}` : 'New Entry'}
              </p>

              {/* Entry name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Entry Name *</label>
                <input
                  type="text" value={entryName}
                  onChange={(e) => setEntryName(e.target.value)}
                  placeholder="e.g. Morning Sales, Counter 1…"
                  className="input"
                  maxLength={100}
                />
              </div>

              {/* Denominations */}
              <DenominationGrid
                entries={denomEntries}
                onChange={(denom, qty) => setDenomEntries((prev) =>
                  prev.map((e) => e.denomination === denom ? { ...e, quantity: qty } : e)
                )}
                cashTotal={cashTotal}
              />

              {/* Card amount */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Card Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm pointer-events-none">₹</span>
                  <DecimalInput
                    min="0" value={cardAmount}
                    onChange={(e) => setCardAmount(e.target.value)}
                    placeholder="0.00"
                    className="input pl-7 text-base font-semibold"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button onClick={handleSaveEntry} disabled={entrySaving}
                  className="btn-sm btn-primary flex-1">
                  {entrySaving
                    ? <><span className="spinner" /> Saving…</>
                    : editingEntry ? 'Update Entry' : 'Save Entry'
                  }
                </button>
                {(editingEntry || entryName || cashTotal > 0 || cardAmount) && (
                  <button onClick={resetEntryForm} className="btn-sm btn-secondary">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Saved entries list */}
          {entries.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-400">{entries.length} saved {entries.length !== 1 ? 'entries' : 'entry'}</p>
              {entries.map((entry) => {
                const open = expandedEntry === entry.id;
                return (
                  <div key={entry.id} className="card overflow-hidden">
                    <button
                      onClick={() => setExpandedEntry(open ? null : entry.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50/60 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {entry.entry_name?.trim() ? entry.entry_name : `Entry at ${formatTime(entry.created_at)}`}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 tabular-nums">
                          Cash: {formatRupees(entry.cash_in)} · Card: {formatRupees(entry.card_amount)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {isActive && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); startEditEntry(entry); }}
                              className="text-blue-500 hover:text-blue-700 p-1 transition-colors"
                              title="Edit"
                            >
                              <IconEdit size={13} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteEntry(entry.id); }}
                              className="text-red-400 hover:text-red-600 p-1 transition-colors text-xs font-medium"
                              title="Delete"
                            >
                              ✕
                            </button>
                          </>
                        )}
                        <span className="text-gray-300">
                          {open ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                        </span>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {open && (
                      <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/30 space-y-2">
                        {entry.denominations.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {entry.denominations.map((d) => (
                              <span key={d.id}
                                className="text-xs bg-blue-50 text-blue-700 ring-1 ring-blue-100 px-2 py-0.5 rounded font-medium tabular-nums">
                                ₹{d.denomination} × {d.quantity} = {formatRupees(d.amount)}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-gray-400">Cash In</p>
                            <p className="font-semibold text-emerald-700 tabular-nums">{formatRupees(entry.cash_in)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Card</p>
                            <p className="font-semibold text-violet-600 tabular-nums">{formatRupees(entry.card_amount)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {entries.length === 0 && !isActive && (
            <p className="text-xs text-gray-400 text-center py-4">No entries recorded.</p>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 3 — CASH OUTS (multiple with notes)
        ══════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <IconTrendingDown size={14} className="text-red-500" />
            <p className="text-sm font-semibold text-gray-800">Cash Out</p>
            <span className="text-[10px] text-gray-400">Expenses &amp; payments</span>
          </div>

          {/* Cash out form */}
          {isActive && (
            <div id="cashout-form" className="card p-4 space-y-3 mb-3 scroll-mt-14">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {editingCashOut ? 'Edit Cash Out' : 'New Cash Out'}
              </p>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm pointer-events-none">₹</span>
                  <DecimalInput
                    min="0" value={cashOutAmount}
                    onChange={(e) => setCashOutAmount(e.target.value)}
                    placeholder="0.00"
                    className="input pl-7 text-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Note *</label>
                <input
                  type="text" value={cashOutNote}
                  onChange={(e) => setCashOutNote(e.target.value)}
                  placeholder="e.g. Tea & snacks, Petrol…"
                  className="input"
                  maxLength={200}
                />
              </div>

              <div className="flex gap-2">
                <button onClick={handleSaveCashOut} disabled={cashOutSaving}
                  className="btn-sm btn-danger flex-1">
                  {cashOutSaving
                    ? <><span className="spinner !border-white/30 !border-t-white" /> Saving…</>
                    : editingCashOut ? 'Update' : 'Save Cash Out'
                  }
                </button>
                {(editingCashOut || cashOutAmount || cashOutNote) && (
                  <button onClick={resetCashOutForm} className="btn-sm btn-secondary">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Saved cash outs */}
          {cashOuts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-400">
                {cashOuts.length} cash {cashOuts.length !== 1 ? 'outs' : 'out'} · Total {formatRupees(cashOuts.reduce((s, c) => s + Number(c.amount), 0))}
              </p>
              {cashOuts.map((co) => (
                <div key={co.id} className="card overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-red-600 tabular-nums">{formatRupees(co.amount)}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{co.note}</p>
                    </div>
                    {isActive && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => startEditCashOut(co)}
                          className="text-blue-500 hover:text-blue-700 p-1 transition-colors"
                          title="Edit">
                          <IconEdit size={13} />
                        </button>
                        <button onClick={() => handleDeleteCashOut(co.id)}
                          className="text-red-400 hover:text-red-600 p-1 text-xs font-medium transition-colors"
                          title="Delete">
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Returns under this cash out */}
                  {(cashInReturns[co.id] ?? []).length > 0 && (
                    <div className="border-t border-gray-100 px-4 py-2 space-y-1 bg-emerald-50/40">
                      {(cashInReturns[co.id] ?? []).map((r) => (
                        <div key={r.id} className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold text-emerald-700 tabular-nums">+{formatRupees(r.amount)}</span>
                            {r.note && <span className="text-xs text-gray-400 ml-2">{r.note}</span>}
                          </div>
                          {isActive && (
                            <button onClick={() => handleDeleteReturn(r.id, co.id)}
                              className="text-red-400 hover:text-red-600 p-1 text-xs" title="Delete">✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Add Return form / button */}
                  {isActive && (
                    <div className="border-t border-gray-100 px-4 py-2">
                      {showReturnForm === co.id ? (
                        <div className="space-y-2 py-1">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm pointer-events-none">₹</span>
                            <DecimalInput min="0" value={returnAmount} onChange={(e) => setReturnAmount(e.target.value)} placeholder="0.00" className="input pl-7" autoFocus />
                          </div>
                          <input type="text" value={returnNote} onChange={(e) => setReturnNote(e.target.value)} placeholder="Note (optional)" className="input" maxLength={200} />
                          <div className="flex gap-2">
                            <button onClick={() => handleSaveReturn(co.id)} disabled={returnSaving} className="btn-sm btn-primary flex-1">
                              {returnSaving ? <><span className="spinner" /> Saving…</> : 'Save Return'}
                            </button>
                            <button onClick={() => { setShowReturnForm(null); setReturnAmount(''); setReturnNote(''); }} className="btn-sm btn-secondary">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setShowReturnForm(co.id); setReturnAmount(''); setReturnNote(''); }} className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1">
                          <IconPlus size={11} /> Add Return
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {cashOuts.length === 0 && !isActive && (
            <p className="text-xs text-gray-400 text-center py-4">No cash outs recorded.</p>
          )}
        </section>

        {/* ── Navigation ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 pt-2 border-t border-gray-200">
          <button onClick={() => router.push('/cashier/my-data')}
            className="c-btn-secondary text-sm">
            My Data
          </button>
          {isActive && (
            <button onClick={() => router.push('/cashier/end-shift')}
              className="c-btn-outline-danger text-sm">
              End Shift
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

const SB_COLORS = {
  emerald: { bg: 'bg-emerald-50', label: 'text-emerald-600', val: 'text-emerald-800' },
  red:     { bg: 'bg-red-50',     label: 'text-red-500',     val: 'text-red-700'     },
  blue:    { bg: 'bg-blue-50',    label: 'text-blue-600',    val: 'text-blue-800'    },
  violet:  { bg: 'bg-violet-50',  label: 'text-violet-600',  val: 'text-violet-800'  },
} as const;

function SummaryBox({ label, value, color }: {
  label: string; value: string; color: keyof typeof SB_COLORS;
}) {
  const c = SB_COLORS[color];
  return (
    <div className={`${c.bg} rounded-xl px-3 py-2.5`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wide ${c.label} mb-0.5`}>{label}</p>
      <p className={`text-base font-bold tabular-nums ${c.val}`}>{value}</p>
    </div>
  );
}
