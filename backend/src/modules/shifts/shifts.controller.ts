import { Request, Response } from 'express';
import { body, query } from 'express-validator';
import * as ShiftsService from './shifts.service';
import { sendSuccess, sendError } from '../../utils/response';
import { isValidDate, isValidDateRange } from '../../utils/dateUtils';
import { ShiftFilter } from '../../types';

// ─── Cashier Controllers ──────────────────────────────────────────────────────

export async function openShift(req: Request, res: Response): Promise<void> {
  try {
    const shift = await ShiftsService.openShift(req.user!.userId);
    sendSuccess(res, 'Shift opened successfully.', shift, 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Failed to open shift.', 400);
  }
}

export async function getMyActiveShift(req: Request, res: Response): Promise<void> {
  try {
    const shift = await ShiftsService.getActiveShift(req.user!.userId);
    if (!shift) { sendError(res, 'No active shift found.', 404); return; }
    sendSuccess(res, 'Active shift retrieved.', shift);
  } catch {
    sendError(res, 'Failed to retrieve active shift.', 500);
  }
}

export const updateCashInValidation = [
  body('amount')
    .isFloat({ min: 0 }).withMessage('amount must be a non-negative number.'),
];

export async function updateCashIn(req: Request, res: Response): Promise<void> {
  try {
    const cashierId = req.user!.userId;
    const { shift_id, amount } = req.body as { shift_id: string; amount: number };
    if (!shift_id) { sendError(res, 'shift_id is required.', 422); return; }
    const shift = await ShiftsService.updateOpeningCashIn(shift_id, cashierId, Number(amount));
    sendSuccess(res, 'Cash In updated.', shift);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Failed to update Cash In.', 400);
  }
}

export async function endMyShift(req: Request, res: Response): Promise<void> {
  try {
    const { shift_id } = req.body as { shift_id: string };
    if (!shift_id) { sendError(res, 'shift_id is required.', 422); return; }
    const completed = await ShiftsService.endShift(shift_id, req.user!.userId);
    sendSuccess(res, 'Shift ended successfully.', completed);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Failed to end shift.', 400);
  }
}

export async function getMyShifts(req: Request, res: Response): Promise<void> {
  try {
    const { from_date, to_date } = req.query as { from_date?: string; to_date?: string };
    if (from_date && !isValidDate(from_date)) { sendError(res, 'Invalid from_date.', 422); return; }
    if (to_date   && !isValidDate(to_date))   { sendError(res, 'Invalid to_date.', 422); return; }
    if (from_date && to_date && !isValidDateRange(from_date, to_date)) {
      sendError(res, 'from_date must be on or before to_date.', 422); return;
    }
    const shifts = await ShiftsService.getCashierShifts(req.user!.userId, from_date, to_date);
    sendSuccess(res, 'Shifts retrieved.', shifts);
  } catch {
    sendError(res, 'Failed to retrieve shifts.', 500);
  }
}

// ─── Admin Controllers ────────────────────────────────────────────────────────

export const adminGetShiftsValidation = [
  query('from_date').optional().isDate({ format: 'YYYY-MM-DD' }).withMessage('Invalid from_date.'),
  query('to_date').optional().isDate({ format: 'YYYY-MM-DD' }).withMessage('Invalid to_date.'),
  query('cashier_id').optional().isUUID().withMessage('Invalid cashier_id.'),
  query('status').optional().isIn(['all', 'active', 'completed']).withMessage('Invalid status.'),
];

export async function adminGetShifts(req: Request, res: Response): Promise<void> {
  try {
    const { from_date, to_date, cashier_id, status } = req.query as Record<string, string | undefined>;
    if (from_date && to_date && !isValidDateRange(from_date, to_date)) {
      sendError(res, 'from_date must be on or before to_date.', 422); return;
    }
    const filter: ShiftFilter = { from_date, to_date, cashier_id };
    if (status === 'active' || status === 'completed') filter.status = status;
    else if (status === 'all') filter.status = 'all';
    const shifts = await ShiftsService.getAllShifts(filter);
    sendSuccess(res, 'Shifts retrieved.', shifts);
  } catch {
    sendError(res, 'Failed to retrieve shifts.', 500);
  }
}

export async function adminGetShiftById(req: Request, res: Response): Promise<void> {
  try {
    const shift = await ShiftsService.getShiftById(req.params.id);
    if (!shift) { sendError(res, 'Shift not found.', 404); return; }
    sendSuccess(res, 'Shift retrieved.', shift);
  } catch {
    sendError(res, 'Failed to retrieve shift.', 500);
  }
}
