import { Request, Response } from 'express';
import * as ReportsService from './reports.service';
import { sendSuccess, sendError } from '../../utils/response';
import { isValidDate, isValidDateRange, todayDateString } from '../../utils/dateUtils';

export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = await ReportsService.getDashboardStats();
    sendSuccess(res, 'Dashboard stats retrieved.', stats);
  } catch {
    sendError(res, 'Failed to retrieve dashboard stats.', 500);
  }
}

export async function getReport(req: Request, res: Response): Promise<void> {
  try {
    const { from_date, to_date, cashier_id } = req.query as {
      from_date?: string;
      to_date?: string;
      cashier_id?: string;
    };

    const today = todayDateString();
    const fromDate = from_date || today;
    const toDate   = to_date   || today;

    if (!isValidDate(fromDate)) {
      sendError(res, 'Invalid from_date. Use YYYY-MM-DD.', 422);
      return;
    }
    if (!isValidDate(toDate)) {
      sendError(res, 'Invalid to_date. Use YYYY-MM-DD.', 422);
      return;
    }
    if (!isValidDateRange(fromDate, toDate)) {
      sendError(res, 'from_date must be on or before to_date.', 422);
      return;
    }

    const report = await ReportsService.getReport(fromDate, toDate, cashier_id);
    sendSuccess(res, 'Report retrieved.', report);
  } catch {
    sendError(res, 'Failed to generate report.', 500);
  }
}

export async function getRangeSummary(req: Request, res: Response): Promise<void> {
  try {
    const { from_date, to_date, cashier_id } = req.query as {
      from_date?: string;
      to_date?: string;
      cashier_id?: string;
    };

    const today = todayDateString();
    const fromDate = from_date || today;
    const toDate   = to_date   || today;

    if (!isValidDate(fromDate) || !isValidDate(toDate)) {
      sendError(res, 'Invalid date format. Use YYYY-MM-DD.', 422);
      return;
    }
    if (!isValidDateRange(fromDate, toDate)) {
      sendError(res, 'from_date must be on or before to_date.', 422);
      return;
    }

    const summary = await ReportsService.getRangeSummary(fromDate, toDate, cashier_id);
    sendSuccess(res, 'Summary retrieved.', summary);
  } catch {
    sendError(res, 'Failed to retrieve summary.', 500);
  }
}
