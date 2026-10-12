import api from './api';
import { ApiResponse, Shift, Entry, CashOut, CashInReturn } from '../types';

// ─── Shifts ───────────────────────────────────────────────────────────────────

export async function openShift(): Promise<Shift> {
  const res = await api.post<ApiResponse<Shift>>('/cashier/shifts');
  return res.data.data!;
}

export async function getActiveShift(): Promise<Shift | null> {
  try {
    const res = await api.get<ApiResponse<Shift>>('/cashier/shifts/active');
    return res.data.data ?? null;
  } catch (err: unknown) {
    if (
      typeof err === 'object' && err !== null && 'response' in err &&
      (err as { response?: { status?: number } }).response?.status === 404
    ) return null;
    return null;
  }
}

export async function updateCashIn(shiftId: string, amount: number): Promise<Shift> {
  const res = await api.patch<ApiResponse<Shift>>('/cashier/shifts/cash-in', {
    shift_id: shiftId,
    amount,
  });
  return res.data.data!;
}

export async function endShift(shiftId: string): Promise<Shift> {
  const res = await api.patch<ApiResponse<Shift>>('/cashier/shifts/end', { shift_id: shiftId });
  return res.data.data!;
}

export async function getMyShifts(fromDate?: string, toDate?: string): Promise<Shift[]> {
  const params: Record<string, string> = {};
  if (fromDate) params.from_date = fromDate;
  if (toDate)   params.to_date   = toDate;
  const res = await api.get<ApiResponse<Shift[]>>('/cashier/shifts', { params });
  return res.data.data ?? [];
}

// ─── Entries (named denomination + card) ─────────────────────────────────────

export interface DenominationInput { denomination: number; quantity: number; }

export async function createEntry(
  shiftId: string,
  entryName: string,
  denominations: DenominationInput[],
  cardAmount: number,
): Promise<Entry> {
  const res = await api.post<ApiResponse<Entry>>('/cashier/entries', {
    shift_id: shiftId,
    entry_name: entryName,
    denominations,
    card_amount: cardAmount,
  });
  return res.data.data!;
}

export async function updateEntry(
  entryId: string,
  entryName: string,
  denominations: DenominationInput[],
  cardAmount: number,
): Promise<Entry> {
  const res = await api.put<ApiResponse<Entry>>(`/cashier/entries/${entryId}`, {
    entry_name: entryName,
    denominations,
    card_amount: cardAmount,
  });
  return res.data.data!;
}

export async function deleteEntry(entryId: string): Promise<void> {
  await api.delete(`/cashier/entries/${entryId}`);
}

export async function getShiftEntries(shiftId: string): Promise<Entry[]> {
  const res = await api.get<ApiResponse<Entry[]>>(`/cashier/shifts/${shiftId}/entries`);
  return res.data.data ?? [];
}

// ─── Cash Outs ────────────────────────────────────────────────────────────────

export async function createCashOut(
  shiftId: string,
  amount: number,
  note: string,
): Promise<CashOut> {
  const res = await api.post<ApiResponse<CashOut>>('/cashier/cash-outs', {
    shift_id: shiftId,
    amount,
    note,
  });
  return res.data.data!;
}

export async function updateCashOut(
  cashOutId: string,
  amount: number,
  note: string,
): Promise<CashOut> {
  const res = await api.put<ApiResponse<CashOut>>(`/cashier/cash-outs/${cashOutId}`, {
    amount,
    note,
  });
  return res.data.data!;
}

export async function deleteCashOut(cashOutId: string): Promise<void> {
  await api.delete(`/cashier/cash-outs/${cashOutId}`);
}

export async function getShiftCashOuts(shiftId: string): Promise<CashOut[]> {
  const res = await api.get<ApiResponse<CashOut[]>>(`/cashier/shifts/${shiftId}/cash-outs`);
  return res.data.data ?? [];
}

// ─── Cash In Returns ──────────────────────────────────────────────────────────

export async function addCashInReturn(
  cashOutId: string,
  shiftId: string,
  amount: number,
  note: string,
): Promise<CashInReturn> {
  const res = await api.post<ApiResponse<CashInReturn>>('/cashier/cash-in-returns', {
    cash_out_id: cashOutId,
    shift_id: shiftId,
    amount,
    note,
  });
  return res.data.data!;
}

export async function deleteCashInReturn(id: string): Promise<void> {
  await api.delete(`/cashier/cash-in-returns/${id}`);
}

export async function getCashInReturnsForShift(shiftId: string): Promise<CashInReturn[]> {
  const res = await api.get<ApiResponse<CashInReturn[]>>('/cashier/cash-in-returns', {
    params: { shift_id: shiftId },
  });
  return res.data.data ?? [];
}
