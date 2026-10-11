import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { sendError } from '../utils/response';

/**
 * Reads express-validator results and short-circuits with a 422 if any fail.
 */
export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    sendError(res, 'Validation failed.', 422, messages);
    return;
  }
  next();
}
