import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { getDashboardStats, getReport, getRangeSummary } from './reports.controller';

const router = Router();

// All report routes are admin-only
router.use(authenticate, authorize('admin'));

router.get('/admin/dashboard',       getDashboardStats);
router.get('/admin/reports',         getReport);
router.get('/admin/reports/summary', getRangeSummary);

export default router;
