# CashDesk Web App — Audit Report

## Summary

The web app is a **well-structured, mobile-first Next.js 14 cashier interface** that mirrors the
mobile app's core shift workflow. It is functional but not yet production-ready: the biggest
blocker is that in its local `.env.local` it points at `http://localhost:4000/api` (the old
Express backend) instead of its own Next.js API routes, which means the deployed Vercel instance
works correctly (mobile app already uses `https://cashdesk-eight.vercel.app/api`) but any local
dev session breaks unless the Express server is also running. There are also several UX gaps,
missing QoL features, a JWT secret in `.env.local` that is not production-grade, and two small
logic bugs.

---

## 1. Current Functionality

| Route | What it does |
|---|---|
| `/login` | Username/password login → auto-starts shift → redirects to `/cashier/shift` |
| `/cashier/dashboard` | Immediate server-side redirect to `/cashier/shift` |
| `/cashier/shift` | **Main working page**: opening float, named entries with denomination grid, cash outs. Full CRUD for entries and cash outs. Summary strip (Cash In / Cash Out / Balance / Card). |
| `/cashier/end-shift` | Shift summary → confirm → end shift & logout |
| `/cashier/my-data` | Date-range filter, past shifts list with expandable detail (entries + cash outs) |

Middleware (`middleware.ts`) gates all `/cashier/*` routes behind the `cashdesk_token` cookie and
enforces the `cashier` role. Already-authenticated users are bounced away from `/login`.

The Next.js API layer (`app/src/app/api/`) has a full server-side implementation:
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/register`
- Full CRUD for cashier shifts, entries, cash-outs
- Admin shift routes
- Server-side services in `app/src/lib/server/` (auth, shifts, entries, cash-outs, reports, users)

These routes are what the **mobile app** calls (at `https://cashdesk-eight.vercel.app/api`).

---

## 2. API Connectivity — Critical Finding

### The mismatch

| Consumer | `NEXT_PUBLIC_API_URL` / API base |
|---|---|
| Mobile app (production APK) | `https://cashdesk-eight.vercel.app/api` — hits Next.js API routes on Vercel |
| Web app (`.env.local`) | `http://localhost:4000/api` — hits the old Express backend locally |

**Evidence:**
- `app/.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:4000/api`
- `mobile/.env`: `EXPO_PUBLIC_API_URL=https://cashdesk-eight.vercel.app/api`
- `mobile/eas.json`: both preview and production profiles set `EXPO_PUBLIC_API_URL` to the Vercel URL
- `app/src/lib/api.ts` line: `const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';`
- `app/next.config.js` also falls back to `http://localhost:4000/api`

**Impact in production (Vercel):** The web app deployed on Vercel calls its own Next.js API routes
(the URL becomes relative or the env var needs to be set in the Vercel project). If Vercel's env
var is not explicitly set, the `|| 'http://localhost:4000/api'` fallback will fail silently on the
server since there is no Express process running there.

**Correct fix for local dev and production:** The web app's client-side calls should point at
`/api` (relative, so same origin) rather than an absolute URL — or the `.env.local` must be
updated to `http://localhost:3000/api` to hit the Next.js server running on port 3000. Using the
Express backend (`port 4000`) for local web dev doubles infrastructure requirements.

**Recommendation:** Change `NEXT_PUBLIC_API_URL` to `/api` (relative path) in `.env.local`, or
add `NEXT_PUBLIC_API_URL=https://cashdesk-eight.vercel.app/api` to the Vercel project environment
variables. The Express backend should be considered legacy.

---

## 3. JWT / Token Inconsistency — Bug

`app/.env.local` sets `JWT_EXPIRES_IN=8h` — tokens issued by the web app's own Next.js
`/api/auth/login` expire in 8 hours.

`backend/.env` sets `JWT_EXPIRES_IN=30d` — tokens issued by the Express backend expire in 30 days.

`app/src/lib/auth.ts` sets the cookie with `expires: 30` (30 calendar days), regardless of actual
JWT expiry. So if the web app logs in (8h token), the cookie persists for 30 days but the API
starts returning 401 after 8 hours.

**Effect:** Users get silently bounced to `/login` mid-shift after 8 hours without a meaningful
error message. The middleware will let them through (cookie still valid), but every API call fails
with 401 and the 401 interceptor in `api.ts` redirects them to `/login`.

**Recommendation:** Either raise `JWT_EXPIRES_IN` in `app/.env.local` to match how long a
cashier's shift might realistically run (e.g., `24h`), or align cookie expiry with JWT expiry.

---

## 4. UI / UX Issues

### 4a. Login page — no logo image
The login page (`app/src/app/login/page.tsx`) renders a plain blue rounded square with a ₹ symbol
as the "logo" — an inline div, not an `<img>` or `<Image>` tag. The mobile app updated its login
screen to show the actual logo image. The web login page has not received the same treatment.

```tsx
// login/page.tsx — current "logo"
<div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-3">
  <span className="text-white font-bold text-xl leading-none">₹</span>
</div>
```

### 4b. Shift page — `isActive` guard is correct, but UI doesn't show ended-shift reason
If a cashier navigates to `/cashier/shift` with a shift that has `status: 'completed'` (e.g.,
after ending), `isActive` is `false`, forms are hidden, and a static "No entries recorded" empty
message shows for both sections. There is no banner or message explaining that the shift has ended,
which is confusing.

### 4c. Header shows no navigation between pages
`CashierHeader` only shows a back button when explicitly given `showBack`. There is no bottom tab
bar or persistent navigation. The shift page has two buttons at the bottom ("My Data" and "End
Shift"), but they are below all the content and easy to miss on longer shifts with many entries.
On mobile, reaching these buttons requires scrolling to the very bottom.

### 4d. CashierHeader uses `getStoredUser()` — localStorage only
`CashierHeader.tsx` calls `getStoredUser()` which reads from `localStorage`. On first render in
SSR (or if `localStorage` is cleared), `user` will be `null` and the user name won't appear.
There is a `typeof window === 'undefined'` guard, but no loading state — the name just silently
disappears. Minor, but noticeable on hard refresh.

### 4e. No `hover:` states on summary boxes
`SummaryBox` in `shift/page.tsx` uses purely static colors; there are no hover/focus states.
Not a blocker but inconsistent with the rest of the design system.

### 4f. "Cash In" label is confusing
The "Cash In" summary box (`SummaryBox label="Cash In"`) shows
`opening_cash_in + total_entries_cash` — i.e., the total of all cash received. But the "Cash In"
section header on the same page says "Cash In (Opening float)", referring only to the opening
float. Two different things share the same label, which is inconsistent.

### 4g. `my-data` page — no initial load, no empty-state messaging
The My Data page starts with no shifts displayed and no explanation. The user must manually press
"View". The mobile app auto-loads today's data on open. There is an `EmptyState` component
available (`components/ui/EmptyState.tsx`) but it is not used here for the initial state.

---

## 5. Bugs

### 5a. `loadAll` in shift page doesn't guard `setLoading(false)` on error
`cashier/shift/page.tsx` — `loadAll` calls `getActiveShift()`, then if no shift is found it
redirects. But if `getActiveShift()` throws (network error), the `setLoading(false)` line on the
happy path is never reached, and the page stays on the spinner forever. There is no `try/catch`
around the initial load.

```ts
// shift/page.tsx — missing error handling
const loadAll = useCallback(async () => {
  const s = await getActiveShift();   // can throw
  if (!s) { router.push('/login'); return; }
  setShift(s);
  setCashInAmount(s.opening_cash_in > 0 ? String(s.opening_cash_in) : '');
  setLoading(false);                  // never reached on throw
  // ...
}, [router]);
```

Same issue exists in `end-shift/page.tsx` — `useEffect` calls `getActiveShift().then(...)` with
no `.catch()`.

### 5b. `opening_cash_in` compared with falsy `0`
In `shift/page.tsx`:
```tsx
{isActive && !shift?.opening_cash_in && (
  <button …>Enter opening float</button>
)}
```
`!shift?.opening_cash_in` is `true` when the value is `0`, which is a valid saved value (cashier
started with ₹0 float). This means the "Enter opening float" button keeps showing even after the
cashier explicitly saved ₹0 as the opening cash. The display above it already says ₹0 correctly
via the `> 0` check, creating a visual contradiction.

The same `> 0` pattern used in the display:
```tsx
{shift?.opening_cash_in && Number(shift.opening_cash_in) > 0
  ? formatRupees(shift.opening_cash_in)
  : <span className="text-gray-300">Not set</span>
}
```
Both branches should use `opening_cash_in !== null && opening_cash_in !== undefined` (i.e., check
for null/undefined, not falsiness) to distinguish "not yet entered" from "entered as 0".

### 5c. `ConfirmModal` uses `confirmLabel = 'Delete'` hardcoded by default for cash-out edit actions
When the confirm modal fires for deleting a cash out, the modal shows "Delete" as the button
label — which is correct. But if in the future the same modal were reused for non-delete
confirmations, the default label would be wrong. Minor, not currently broken.

### 5d. `dashboard/page.tsx` uses server-side `redirect()` — but the route group layout is trivial
`cashier/dashboard/page.tsx` is a server component that just calls `redirect('/cashier/shift')`.
This works, but the `(cashier)/layout.tsx` is empty (just `<>{children}</>`). If the layout ever
grows, the redirect happens before the layout renders, which is fine. No bug, just noting it's
dead code if the dashboard route is never directly linked.

---

## 6. Missing Features (compared to mobile app)

Reviewing the open editor files (mobile `ShiftScreen.tsx`, `EndShiftScreen.tsx`, `LoginScreen.tsx`):

| Feature | Mobile | Web |
|---|---|---|
| Logo on login screen | ✅ Image asset | ❌ Placeholder ₹ icon |
| Greeting on shift screen | ✅ | ✅ |
| Opening float | ✅ | ✅ |
| Named entries + denomination grid | ✅ | ✅ |
| Cash outs | ✅ | ✅ |
| End shift summary + logout | ✅ | ✅ |
| My data / shift history | ✅ | ✅ |
| Pull-to-refresh on shift screen | ✅ (native) | ❌ No refresh button; data loads once on mount |
| Toast notifications | ✅ | ✅ (react-hot-toast) |
| Registration screen | ✅ (mobile has `LoginScreen` with register flow check) | ❌ No registration page (API route exists at `/api/auth/register` but no UI) |
| Bottom navigation tabs | ✅ (tab bar) | ❌ Buttons at page bottom only |

---

## 7. Overall Quality Assessment

### What's good
- Clean, consistent design system in `globals.css` — custom utility classes (`c-btn`, `input`,
  `card`, `badge-*`) are well-named and used consistently across all pages.
- Mobile-first CSS: `min-height: 44px` touch targets, `font-size: 16px` on inputs (no iOS zoom),
  `safe-area-inset` padding, `overscroll-behavior-y: contain`, `userScalable: false`.
- TypeScript is used properly throughout; types are defined in `types/index.ts` and shared.
- `DenominationGrid` is a clean, reusable component.
- The `ConfirmModal` is a good pattern — no `window.confirm()`.
- `NumberInput` / `DecimalInput` correctly prevent scroll-wheel value changes.
- Middleware handles role-based auth correctly at the edge.
- The format utilities (`formatRupees`, `formatDate`, `formatTime`) are clean and reused.

### What needs work before production
1. **API URL** — web app must not depend on local Express server (fix `.env.local` and Vercel env var).
2. **JWT expiry** — align `JWT_EXPIRES_IN` between `app/.env.local` and `backend/.env`.
3. **Logo on login** — add the actual logo image to match mobile.
4. **Error handling** in `loadAll` (shift page) and `useEffect` (end-shift page) — add try/catch.
5. **`opening_cash_in === 0` bug** — use `null` check instead of falsy check.
6. **No refresh mechanism** on the shift page — a manual refresh button or pull-to-refresh equivalent.
7. **JWT secret** in `.env.local` is `cashdesk_dev_jwt_secret_change_in_production_min_32_chars` —
   the name literally says "change in production" but there is no production env file or Vercel
   variable evidence that it has been changed. This is a security risk.

---

## Recommendations (Priority Order)

1. **Fix API URL** (high, production blocker) — set `NEXT_PUBLIC_API_URL=/api` in `.env.local` so
   local dev uses Next.js API routes, not Express. Set the Vercel env var explicitly.
2. **Fix JWT expiry** (high, UX blocker) — change `JWT_EXPIRES_IN` in `app/.env.local` to `24h`
   or `30d` to match the cookie lifetime.
3. **Change JWT secret** (high, security) — set a cryptographically strong secret in the Vercel
   project environment variables, not in a committed `.env.local`.
4. **Fix `opening_cash_in` null check** (medium, logic bug) — distinguish null/undefined from 0.
5. **Add try/catch to `loadAll`** (medium, reliability) — prevents infinite spinner on network error.
6. **Add logo to login page** (medium, brand consistency) — use the same image asset as the mobile
   app (likely already in `mobile/assets/`).
7. **Add a refresh/reload button** to the shift page (low, UX) — so cashiers can sync without a
   hard browser reload.
8. **Add a "shift has ended" banner** when `status === 'completed'` on the shift page (low, UX).
9. **Auto-load today's shifts** on the My Data page (low, UX convenience).
