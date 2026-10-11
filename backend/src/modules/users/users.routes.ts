import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  listCashiers,
  getCashier,
  createCashier,
  updateCashierStatus,
  resetPassword,
  createCashierValidation,
  resetPasswordValidation,
} from './users.controller';

const router = Router();

// All routes here are admin-only
router.use(authenticate, authorize('admin'));

router.get('/',               listCashiers);
router.get('/:id',            getCashier);
router.post('/',              createCashierValidation, validate, createCashier);
router.patch('/:id/status',   updateCashierStatus);
router.patch('/:id/password', resetPasswordValidation, validate, resetPassword);

export default router;
