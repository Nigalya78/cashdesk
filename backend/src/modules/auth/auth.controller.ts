import { Request, Response } from 'express';
import { body } from 'express-validator';
import { loginUser, registerUser, getUserById } from './auth.service';
import { sendSuccess, sendError } from '../../utils/response';

export const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ max: 100 }).withMessage('Name is too long.'),
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required.')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be 3–50 characters.')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers and underscores.'),
  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 6, max: 128 }).withMessage('Password must be at least 6 characters.'),
];

export const loginValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required.')
    .isLength({ max: 50 }).withMessage('Username is too long.'),
  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ max: 128 }).withMessage('Password is too long.'),
];

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, username, password } = req.body as { name: string; username: string; password: string };
    const user = await registerUser(name, username, password);
    sendSuccess(res, 'Registration successful. You can now log in.', user, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed.';
    sendError(res, message, 400);
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body as { username: string; password: string };
    const result = await loginUser(username, password);
    sendSuccess(res, 'Login successful.', result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login failed.';
    sendError(res, message, 401);
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const user = await getUserById(req.user!.userId);
    if (!user) { sendError(res, 'User not found.', 404); return; }
    sendSuccess(res, 'Authenticated.', user);
  } catch {
    sendError(res, 'Failed to retrieve user.', 500);
  }
}
