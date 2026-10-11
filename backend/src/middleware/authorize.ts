import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';
import { sendError } from '../utils/response';

/**
 * Middleware factory that restricts access to specific roles.
 * Usage: router.get('/admin/...', authenticate, authorize('admin'), handler)
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required.', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, 'You do not have permission to access this resource.', 403);
      return;
    }

    next();
  };
}
