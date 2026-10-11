import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes        from './modules/auth/auth.routes';
import usersRoutes       from './modules/users/users.routes';
import shiftsRoutes      from './modules/shifts/shifts.routes';
import transactionsRoutes from './modules/transactions/transactions.routes';
import cashOutsRoutes    from './modules/cash-outs/cash-outs.routes';
import reportsRoutes     from './modules/reports/reports.routes';
import { sendError }     from './utils/response';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// ─── Security Middleware ──────────────────────────────────────────────────────

app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Rate limiting — stricter on auth endpoint
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // max 20 login attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

app.use(globalLimiter);
app.use('/api/auth/login', authLimiter);

// ─── Body Parsing ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'CashDesk API is running.', timestamp: new Date() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth',   authRoutes);
app.use('/api/users',  usersRoutes);
app.use('/api',        shiftsRoutes);
app.use('/api',        transactionsRoutes);
app.use('/api',        cashOutsRoutes);
app.use('/api',        reportsRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────

app.use((_req, res) => {
  sendError(res, 'Endpoint not found.', 404);
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  // Never expose stack traces to clients
  sendError(res, 'An unexpected error occurred. Please try again.', 500);
});

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ CashDesk API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
