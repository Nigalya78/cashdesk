import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  openShift, getMyActiveShift, updateCashIn, updateCashInValidation,
  endMyShift, getMyShifts,
  adminGetShifts, adminGetShiftById, adminGetShiftsValidation,
} from './shifts.controller';

const router = Router();

// Cashier
router.post(  '/cashier/shifts',          authenticate, authorize('cashier'), openShift);
router.get(   '/cashier/shifts/active',   authenticate, authorize('cashier'), getMyActiveShift);
router.patch( '/cashier/shifts/cash-in',  authenticate, authorize('cashier'), updateCashInValidation, validate, updateCashIn);
router.patch( '/cashier/shifts/end',      authenticate, authorize('cashier'), endMyShift);
router.get(   '/cashier/shifts',          authenticate, authorize('cashier'), getMyShifts);

// Admin
router.get('/admin/shifts',     authenticate, authorize('admin'), adminGetShiftsValidation, validate, adminGetShifts);
router.get('/admin/shifts/:id', authenticate, authorize('admin'), adminGetShiftById);

export default router;
