import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createCashOut, updateCashOut, deleteCashOut, getShiftCashOuts,
  cashOutValidation, updateCashOutValidation,
} from './cash-outs.controller';

const router = Router();

// POST   /api/cashier/cash-outs                    — create cash out
// PUT    /api/cashier/cash-outs/:id                — update cash out
// DELETE /api/cashier/cash-outs/:id                — delete cash out
// GET    /api/cashier/shifts/:shiftId/cash-outs    — get cash outs for shift

router.post(   '/cashier/cash-outs',
  authenticate, authorize('cashier'), cashOutValidation, validate, createCashOut);

router.put(    '/cashier/cash-outs/:id',
  authenticate, authorize('cashier'), updateCashOutValidation, validate, updateCashOut);

router.delete( '/cashier/cash-outs/:id',
  authenticate, authorize('cashier'), deleteCashOut);

router.get(    '/cashier/shifts/:shiftId/cash-outs',
  authenticate, authorize('cashier'), getShiftCashOuts);

export default router;
