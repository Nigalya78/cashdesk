import jwt from 'jsonwebtoken';
import { JwtPayload, UserRole } from './types';

/**
 * Verifies the Bearer token from the Authorization header.
 * Throws an Error with a user-facing message on failure.
 */
export function requireAuth(request: Request): JwtPayload {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication required.');
  }
  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Server configuration error.');
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    throw new Error('Invalid or expired token. Please log in again.');
  }
}

/**
 * Checks that the JWT payload has one of the allowed roles.
 * Throws an Error with a user-facing message on failure.
 */
export function requireRole(payload: JwtPayload, ...roles: UserRole[]): void {
  if (!roles.includes(payload.role)) {
    throw new Error('You do not have permission to access this resource.');
  }
}
