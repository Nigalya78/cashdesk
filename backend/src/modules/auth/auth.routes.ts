import { Router } from 'express';
import { login, register, getMe, loginValidation, registerValidation } from './auth.controller';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';

const router = Router();

// POST /api/auth/register
router.post('/register', registerValidation, validate, register);

// POST /api/auth/login
router.post('/login', loginValidation, validate, login);

// GET /api/auth/me  — returns the current user from token
router.get('/me', authenticate, getMe);

export default router;
