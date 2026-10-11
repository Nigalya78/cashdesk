import { Request, Response } from 'express';
import { body, param } from 'express-validator';
import * as Service from './cash-outs.service';
import { sendSuccess, sendError } from '../../utils/response';

export const cashOutValidation = [
  body('shift_id').optional().isUUID().withMessage('Invalid shift_id.'),
  body('amount').isFloat({ min: 0.01 }).withMessage('amount must be greater than 0.'),
  body('note').trim().notEmpty().withMessage('Note is required.')
    .isLength({ max: 200 }).withMessage('Note max 200 characters.'),
];

export const updateCashOutValidation = [
  param('id').isUUID().withMessage('Invalid cash out ID.'),
  body('amount').isFloat({ min: 0.01 }).withMessage('amount must be greater than 0.'),
  body('note').trim().notEmpty().withMessage('Note is required.')
    .isLength({ max: 200 }).withMessage('Note max 200 characters.'),
];

export async function createCashOut(req: Request, res: Response): Promise<void> {
  try {
    const cashierId = req.user!.userId;
    const { shift_id, amount, note } = req.body as { shift_id: string; amount: number; note: string };
    const cashOut = await Service.createCashOut(shift_id, cashierId, Number(amount), note);
    sendSuccess(res, 'Cash out saved.', cashOut, 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Failed to save cash out.', 400);
  }
}

export async function updateCashOut(req: Request, res: Response): Promise<void> {
  try {
    const cashierId = req.user!.userId;
    const { amount, note } = req.body as { amount: number; note: string };
    const cashOut = await Service.updateCashOut(req.params.id, cashierId, Number(amount), note);
    sendSuccess(res, 'Cash out updated.', cashOut);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Failed to update cash out.', 400);
  }
}

export async function deleteCashOut(req: Request, res: Response): Promise<void> {
  try {
    await Service.deleteCashOut(req.params.id, req.user!.userId);
    sendSuccess(res, 'Cash out deleted.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Failed to delete cash out.', 400);
  }
}

export async function getShiftCashOuts(req: Request, res: Response): Promise<void> {
  try {
    const cashOuts = await Service.getShiftCashOuts(req.params.shiftId, req.user!.userId);
    sendSuccess(res, 'Cash outs retrieved.', cashOuts);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Failed to retrieve cash outs.', 400);
  }
}
