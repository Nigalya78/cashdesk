import { Request, Response } from 'express';
import { body, param } from 'express-validator';
import * as Service from './transactions.service';
import { sendSuccess, sendError } from '../../utils/response';
import { VALID_DENOMINATIONS, DenominationValue } from '../../types';

// ─── Validation ───────────────────────────────────────────────────────────────

const denomBody = body('denominations')
  .isArray().withMessage('denominations must be an array.')
  .custom((arr: { denomination: number; quantity: number }[]) => {
    for (const item of arr) {
      if (!VALID_DENOMINATIONS.includes(item.denomination as DenominationValue))
        throw new Error(`Invalid denomination: ${item.denomination}`);
      if (typeof item.quantity !== 'number' || item.quantity < 0 || !Number.isInteger(item.quantity))
        throw new Error('Denomination quantity must be a non-negative integer.');
    }
    return true;
  });

export const createEntryValidation = [
  body('shift_id').isUUID().withMessage('Invalid shift_id.'),
  body('entry_name').trim().notEmpty().withMessage('Entry name is required.')
    .isLength({ max: 100 }).withMessage('Entry name max 100 characters.'),
  denomBody,
  body('card_amount').isFloat({ min: 0 }).withMessage('card_amount must be non-negative.'),
];

export const updateEntryValidation = [
  param('id').isUUID().withMessage('Invalid entry ID.'),
  body('entry_name').trim().notEmpty().withMessage('Entry name is required.')
    .isLength({ max: 100 }).withMessage('Entry name max 100 characters.'),
  denomBody,
  body('card_amount').isFloat({ min: 0 }).withMessage('card_amount must be non-negative.'),
];

// ─── Cashier Controllers ──────────────────────────────────────────────────────

export async function createEntry(req: Request, res: Response): Promise<void> {
  try {
    const cashierId = req.user!.userId;
    const { shift_id, entry_name, denominations, card_amount } = req.body as {
      shift_id: string; entry_name: string;
      denominations: { denomination: DenominationValue; quantity: number }[];
      card_amount: number;
    };
    const entry = await Service.createEntry({
      shift_id, cashier_id: cashierId, entry_name,
      denominations, card_amount: Number(card_amount),
    });
    sendSuccess(res, 'Entry saved successfully.', entry, 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Failed to save entry.', 400);
  }
}

export async function updateEntry(req: Request, res: Response): Promise<void> {
  try {
    const cashierId = req.user!.userId;
    const { entry_name, denominations, card_amount } = req.body as {
      entry_name: string;
      denominations: { denomination: DenominationValue; quantity: number }[];
      card_amount: number;
    };
    const entry = await Service.updateEntry(req.params.id, cashierId, {
      entry_name, denominations, card_amount: Number(card_amount),
    });
    sendSuccess(res, 'Entry updated successfully.', entry);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Failed to update entry.', 400);
  }
}

export async function deleteEntry(req: Request, res: Response): Promise<void> {
  try {
    await Service.deleteEntry(req.params.id, req.user!.userId);
    sendSuccess(res, 'Entry deleted.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Failed to delete entry.', 400);
  }
}

export async function getShiftEntries(req: Request, res: Response): Promise<void> {
  try {
    const entries = await Service.getShiftEntries(req.params.shiftId, req.user!.userId);
    sendSuccess(res, 'Entries retrieved.', entries);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Failed to retrieve entries.', 400);
  }
}
