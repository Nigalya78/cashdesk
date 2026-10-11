import { Request, Response } from 'express';
import { body, param } from 'express-validator';
import * as UsersService from './users.service';
import { sendSuccess, sendError } from '../../utils/response';

export const createCashierValidation = [
  body('name')
    .trim().notEmpty().withMessage('Name is required.')
    .isLength({ max: 100 }).withMessage('Name is too long.'),
  body('username')
    .trim().notEmpty().withMessage('Username is required.')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be 3–50 characters.')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username may only contain letters, numbers, and underscores.'),
  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
];

export const resetPasswordValidation = [
  param('id').isUUID().withMessage('Invalid cashier ID.'),
  body('new_password')
    .notEmpty().withMessage('New password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
];

export async function listCashiers(req: Request, res: Response): Promise<void> {
  try {
    const cashiers = await UsersService.getAllCashiers();
    sendSuccess(res, 'Cashiers retrieved.', cashiers);
  } catch {
    sendError(res, 'Failed to retrieve cashiers.', 500);
  }
}

export async function getCashier(req: Request, res: Response): Promise<void> {
  try {
    const cashier = await UsersService.getCashierById(req.params.id);
    if (!cashier) {
      sendError(res, 'Cashier not found.', 404);
      return;
    }
    sendSuccess(res, 'Cashier retrieved.', cashier);
  } catch {
    sendError(res, 'Failed to retrieve cashier.', 500);
  }
}

export async function createCashier(req: Request, res: Response): Promise<void> {
  try {
    const { name, username, password } = req.body as {
      name: string;
      username: string;
      password: string;
    };
    const cashier = await UsersService.createCashier(name, username, password);
    sendSuccess(res, 'Cashier created successfully.', cashier, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create cashier.';
    sendError(res, message, 400);
  }
}

export async function updateCashierStatus(req: Request, res: Response): Promise<void> {
  try {
    const { status } = req.body as { status: 'active' | 'inactive' };
    if (!['active', 'inactive'].includes(status)) {
      sendError(res, 'Status must be "active" or "inactive".', 422);
      return;
    }
    const cashier = await UsersService.updateCashierStatus(req.params.id, status);
    if (!cashier) {
      sendError(res, 'Cashier not found.', 404);
      return;
    }
    sendSuccess(res, 'Cashier status updated.', cashier);
  } catch {
    sendError(res, 'Failed to update cashier status.', 500);
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { new_password } = req.body as { new_password: string };
    await UsersService.resetCashierPassword(req.params.id, new_password);
    sendSuccess(res, 'Password reset successfully.');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reset password.';
    sendError(res, message, 400);
  }
}
