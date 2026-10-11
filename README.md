# CashDesk — Cashier Shift & Cash Management System

A production-quality cash management application for businesses such as theatres, shops, and counters.

## Project Structure

```
cashdesk/
├── backend/          # Node.js + TypeScript REST API
├── admin/            # Next.js Admin Dashboard
├── mobile/           # React Native Cashier App (Expo)
└── docker-compose.yml
```

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or Docker)
- Expo CLI (`npm i -g expo-cli`) for mobile

---

## Quick Start

### 1. Start the Database

```bash
docker-compose up -d
```

### 2. Backend API

```bash
cd backend
npm install
npm run db:migrate    # Creates all tables
npm run db:seed       # Creates admin + 3 cashiers
npm run dev           # Starts on port 4000
```

### 3. Admin Dashboard

```bash
cd admin
npm install
npm run dev           # Starts on port 3000
```
Open http://localhost:3000 → login with `admin / Admin@1234`

### 4. Mobile App

```bash
cd mobile
npm install
npx expo start
```
Scan QR code with Expo Go app on your phone.

---

## Default Credentials

| Role    | Username | Password     |
|---------|----------|-------------|
| Admin   | admin    | Admin@1234  |
| Cashier | kumar    | Kumar@1234  |
| Cashier | ravi     | Ravi@1234   |
| Cashier | arun     | Arun@1234   |

> Change all passwords immediately in production.

---

## API Endpoints

### Auth
| Method | Path              | Access |
|--------|-------------------|--------|
| POST   | /api/auth/login   | Public |
| GET    | /api/auth/me      | Any authenticated |

### Cashier
| Method | Path                                     | Access   |
|--------|------------------------------------------|----------|
| POST   | /api/cashier/shifts                      | Cashier  |
| GET    | /api/cashier/shifts/active               | Cashier  |
| PATCH  | /api/cashier/shifts/end                  | Cashier  |
| GET    | /api/cashier/shifts                      | Cashier  |
| POST   | /api/cashier/transactions                | Cashier  |
| PUT    | /api/cashier/transactions/:id            | Cashier  |
| GET    | /api/cashier/shifts/:shiftId/transactions| Cashier  |
| GET    | /api/cashier/transactions                | Cashier  |

### Admin
| Method | Path                                          | Access |
|--------|-----------------------------------------------|--------|
| GET    | /api/users                                    | Admin  |
| GET    | /api/users/:id                                | Admin  |
| POST   | /api/users                                    | Admin  |
| PATCH  | /api/users/:id/status                         | Admin  |
| PATCH  | /api/users/:id/password                       | Admin  |
| GET    | /api/admin/shifts                             | Admin  |
| GET    | /api/admin/shifts/:id                         | Admin  |
| GET    | /api/admin/shifts/:shiftId/transactions       | Admin  |
| GET    | /api/admin/transactions                       | Admin  |
| GET    | /api/admin/dashboard                          | Admin  |
| GET    | /api/admin/reports                            | Admin  |
| GET    | /api/admin/reports/summary                    | Admin  |

---

## Key Security Principles

1. **Passwords** are hashed with bcrypt (12 rounds)
2. **JWT tokens** expire in 8 hours
3. **Role-based access** enforced at every API endpoint
4. **Cashier isolation**: cashier ID is always taken from the JWT token, never from request body
5. **Shift locking**: completed shifts cannot be modified — enforced in DB and service layer
6. **One active shift per cashier** enforced by a partial unique index in PostgreSQL
7. **Cash-in totals** always recalculated from denominations server-side — never trusted from frontend
8. **Rate limiting** on login (20 attempts / 15 min) and global (300 req / 15 min)
9. **SQL injection protection** via parameterized queries throughout
10. **Input validation** via express-validator on all mutation endpoints

---

## Data Integrity Rules Implemented

- A cashier cannot have more than one ACTIVE shift (DB unique partial index)
- A cashier cannot create a transaction without an active shift
- A cashier cannot modify transactions on a completed shift
- A cashier cannot access another cashier's data (enforced in service layer using JWT identity)
- Cash In is always recalculated from denomination quantities (server-side)
- Database transactions (BEGIN/COMMIT/ROLLBACK) used for all multi-step writes

---

## Cash Calculation

```
Cash Balance = Total Cash In - Total Cash Out
Card amount is tracked separately and never added to cash balance
```
