import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createEntry, updateEntry, deleteEntry, getShiftEntries,
  createEntryValidation, updateEntryValidation,
} from './transactions.controller';

const router = Router();

// POST   /api/cashier/entries                      — create named entry
// PUT    /api/cashier/entries/:id                  — update named entry
// DELETE /api/cashier/entries/:id                  — delete named entry
// GET    /api/cashier/shifts/:shiftId/entries      — get all entries for a shift

router.post(   '/cashier/entries',
  authenticate, authorize('cashier'), createEntryValidation, validate, createEntry);

router.put(    '/cashier/entries/:id',
  authenticate, authorize('cashier'), updateEntryValidation, validate, updateEntry);

router.delete( '/cashier/entries/:id',
  authenticate, authorize('cashier'), deleteEntry);

router.get(    '/cashier/shifts/:shiftId/entries',
  authenticate, authorize('cashier'), getShiftEntries);

export default router;
