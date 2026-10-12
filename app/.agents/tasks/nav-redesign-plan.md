# Implementation Plan — Navigation Redesign (nav-redesign)

## Goal
1. Login is permanent — tokens never auto-cleared on a network error, only on explicit 401.
2. After login or app open: active shift → Shift screen; no active shift → new StartShift screen.
3. End Shift → navigates to StartShift (stays logged in, does NOT call logout).
4. Manual Logout button lives on StartShift only.

---

## Constraints
- Do NOT touch any file under `app/src/app/api/` or `app/src/lib/server/`.
- Do NOT create a new EAS build — changes must work in the existing installed APK's
  JS bundle only if OTA is used, or the next manual build if not. The mobile plan is
  coded to be drop-in with no native module changes.

---

## Current-state findings (grounded in code read)

### Mobile
| Location | What it does today |
|---|---|
| `authStore.tsx` `restore()` | On network error **deletes** the SecureStore token — user gets logged out if backend is unreachable at startup |
| `authStore.tsx` `login()` | After login, immediately calls `openShift()` — shift always auto-starts |
| `AppNavigator.tsx` | If `isAuthenticated` → always shows `Shift` as root; no StartShift concept |
| `EndShiftScreen.tsx` `handleFinish()` | Calls `logout()` after end — user is logged out |
| `api.ts` (mobile) | No 401 interceptor — token is only cleared in `restore()` (on any error) |

### Web
| Location | What it does today |
|---|---|
| `app/src/lib/api.ts` | 401 interceptor removes cookie and redirects to `/login` ✓ (correct — keep) |
| `app/src/middleware.ts` | No active-shift check — after login always goes to `/cashier/shift` |
| `login/page.tsx` | After login, always opens a shift then pushes to `/cashier/shift` |
| `end-shift/page.tsx` `handleFinish()` | Calls `logout()` then `router.push('/login')` — logs user out |
| `cashierApi.ts` `getActiveShift()` | Returns `null` on any error (swallowed) — usable for redirect logic |

---

## Implementation Plan

---

- [ ] 1. **Mobile — fix `authStore.tsx`: permanent login + 401-only token clear**

  Currently the `restore()` catch block deletes the token on any error (network timeout,
  DNS failure, etc.). Change it so a network/timeout error keeps the token but marks the
  user as unauthenticated for this session — the app opens showing StartShift where the
  user can retry. Only a genuine 401 response from `/auth/me` clears the token.
  Also remove the `openShift()` call from `login()` — shift opening moves to StartShift.
  Add a 401 response interceptor to `api.ts` that deletes the token from SecureStore.

  **Files:**
  - `mobile/src/services/api.ts` — add response interceptor: on 401, delete SecureStore
    token (`TOKEN_KEY`) asynchronously, then reject.
  - `mobile/src/store/authStore.tsx`:
    - `restore()`: if network/timeout error, set `user` from a cached profile if available
      (or leave `user` null), but do **not** delete the token. Only delete token when
      the response comes back 401 (check `err.response?.status === 401`).
    - `login()`: remove the `openShift()` / `getActiveShift()` block entirely — do not
      set `activeShift` during login. Just set the token and `user`.
    - Add new exported function (or extend context) `startShift(): Promise<void>` that
      calls `openShift()`, falling back to `getActiveShift()` on "already active" error,
      and stores the result via `setActiveShift`.

  **Verify:** Build the mobile app (`npx expo export --platform android` dry-run or
  TypeScript check: `cd mobile && npx tsc --noEmit`). No type errors.

---

- [ ] 2. **Mobile — create `StartShiftScreen.tsx`**

  New screen shown when the user is authenticated but has no active shift. It shows:
  - Greeting (time-based, using existing `getGreeting` from `utils/format.ts`)
  - Previous shift summary section — calls `getMyShifts()` and shows the most recent
    completed shift's key numbers (cash balance, entries count, date). If no prior
    shifts, show "No previous shifts yet." Use the same `SummaryRow` style pattern
    from `EndShiftScreen.tsx`.
  - "Start Shift" button — calls `authStore.startShift()`, then navigation auto-updates
    because `activeShift` becomes non-null (AppNavigator reacts).
  - "My Data" button — navigates to `MyData` screen.
  - "Logout" button (secondary/destructive style) — calls `authStore.logout()`.

  **Files:**
  - `mobile/src/screens/StartShiftScreen.tsx` — create new file.

  **Verify:** `cd mobile && npx tsc --noEmit` — no type errors.

---

- [ ] 3. **Mobile — update `AppNavigator.tsx`: add StartShift route, shift-based routing**

  Add `StartShift` to `RootStackParamList` and the navigator. Change the authenticated
  branch: if `activeShift` is null → root is `StartShift`; if `activeShift` is non-null
  → root is `Shift`. React Navigation handles the stack switch automatically when context
  state changes, so no explicit `navigation.navigate` call is needed at the root level.

  Decision: keep a single `Stack.Navigator` and use conditional first-screen approach
  (same pattern already used for Login/Shift split). This avoids adding a nested
  navigator and keeps the gesture/back-button behaviour predictable.

  **Files:**
  - `mobile/src/navigation/AppNavigator.tsx`:
    - Add `StartShift: undefined` to `RootStackParamList`.
    - Import `StartShiftScreen`.
    - In the authenticated branch: render `StartShift` before `Shift` when
      `activeShift === null`; render `Shift` first when `activeShift !== null`.
    - `StartShift` options: `headerShown: false`, `gestureEnabled: false`.
    - Keep `Shift`, `MyData`, `EndShift` in the authenticated stack as before.

  **Verify:** `cd mobile && npx tsc --noEmit` — no type errors.

---

- [ ] 4. **Mobile — update `EndShiftScreen.tsx`: no logout after end shift**

  `handleFinish()` currently calls `logout()`. Replace it with:
  1. `setActiveShift(null)` from `useAuth()` — clears the active shift in context.
  2. No `logout()` call.
  Result: `AppNavigator` sees `isAuthenticated=true` + `activeShift=null` and
  renders `StartShift` as the root automatically.

  Also update the warning text that currently says "will **log you out**" — change to
  "will **end your session** and lock all entries."
  Update the confirm button label from "End Shift & Log Out" to "End Shift".

  **Files:**
  - `mobile/src/screens/EndShiftScreen.tsx`:
    - Destructure `setActiveShift` from `useAuth()`.
    - Replace `await logout()` in `handleFinish` with `setActiveShift(null)`.
    - Update warning text and button label.

  **Verify:** `cd mobile && npx tsc --noEmit` — no type errors.

---

- [ ] 5. **Web — fix `app/src/lib/api.ts`: 401-only token clear (already mostly correct)**

  The existing 401 interceptor already correctly removes the cookie and redirects to
  `/login` on 401 only. No network-error handling is wired into this interceptor, so
  network errors already fall through without clearing the cookie.

  However, the redirect `window.location.href = '/login'` is a hard redirect that loses
  any in-progress state. This is acceptable for 401 (session truly expired).

  **No code change needed here** — document this as "confirmed correct behaviour".
  If a future session-restoration feature is added, revisit.

  **Files:** none.

  **Verify:** read-only confirmation — no action.

---

- [ ] 6. **Web — create `/cashier/start-shift` page**

  New Next.js page for authenticated users with no active shift. Layout matches the
  rest of the cashier web app (uses `CashierHeader`).

  Contents:
  - Time-based greeting (inline `getGreeting` helper, same logic as `shift/page.tsx`).
  - "Start Shift" button — POSTs to `/cashier/shifts`, then `router.push('/cashier/shift')`.
    On "already have an active shift" error, redirect to `/cashier/shift` directly.
  - "My Data" button — links to `/cashier/my-data`.
  - Previous shift summary card — calls `getMyShifts()` from `cashierApi.ts`, picks
    `shifts[0]` (most recent), and shows: date, cash balance, entry count, card total.
    Uses `formatRupees`, `formatDate` from `lib/format.ts`.
  - "Logout" button (danger/outline style) — calls `logout()` from `lib/auth.ts`,
    then `router.push('/login')`.

  **Files:**
  - `app/src/app/(cashier)/cashier/start-shift/page.tsx` — create new file.

  **Verify:** `cd app && npx tsc --noEmit` — no type errors.

---

- [ ] 7. **Web — update `app/src/middleware.ts`: redirect to `/cashier/start-shift` instead of `/cashier/shift` after login**

  Currently the middleware redirects authenticated users on `/login` to `/cashier/shift`.
  Change the redirect target from `/cashier/shift` to `/cashier/start-shift`.
  The start-shift page itself will check for an active shift and redirect to `/cashier/shift`
  if one exists, creating a clean funnel: login → start-shift → shift (if active).

  Add `/cashier/start-shift` to the `matcher` config.

  **Files:**
  - `app/src/middleware.ts`:
    - Change `new URL('/cashier/shift', req.url)` (in the "already logged in on /login" branch)
      to `new URL('/cashier/start-shift', req.url)`.
    - Add `'/cashier/start-shift'` to `matcher` array.

  **Verify:** `cd app && npx tsc --noEmit` — no type errors.

---

- [ ] 8. **Web — update `app/src/app/login/page.tsx`: remove auto shift-open, redirect to start-shift**

  Currently `handleSubmit` calls `POST /cashier/shifts` after login and then pushes to
  `/cashier/shift`. Remove the shift-open call. After successful login, push to
  `/cashier/start-shift` (the page there handles "open or resume shift").

  Remove the `getApiErrorMessage` import for `shiftErr` if it becomes unused — keep
  the import only if it's still referenced for the main login error.

  **Files:**
  - `app/src/app/login/page.tsx`:
    - Remove the `try { await api.post('/cashier/shifts') } catch ...` block.
    - Remove the status message "Starting shift…".
    - Change `router.push('/cashier/shift')` to `router.push('/cashier/start-shift')`.
    - Keep `api` import only if still used; otherwise remove it.

  **Verify:** `cd app && npx tsc --noEmit` — no type errors.

---

- [ ] 9. **Web — update `app/src/app/(cashier)/cashier/end-shift/page.tsx`: no logout on Done**

  `handleFinish()` currently calls `logout()` then `router.push('/login')`. Change to:
  `router.push('/cashier/start-shift')` only — no `logout()` call.

  Update the warning text from "will **log you out**" to "will **end your session** and
  lock all entries."
  Update the button label from "End Shift & Log Out" to "End Shift".

  **Files:**
  - `app/src/app/(cashier)/cashier/end-shift/page.tsx`:
    - Remove `import { logout } from '@/lib/auth'` (no longer needed in this file).
    - Replace `handleFinish()` body with `router.push('/cashier/start-shift')`.
    - Update warning text and button label.

  **Verify:** `cd app && npx tsc --noEmit` — no type errors.

---

- [ ] 10. **Web — update `app/src/app/(cashier)/cashier/shift/page.tsx`: redirect to start-shift when no active shift**

  `loadAll()` currently does `router.push('/login')` when `getActiveShift()` returns null.
  Change this to `router.push('/cashier/start-shift')` so the user lands on StartShift
  rather than being logged out.

  **Files:**
  - `app/src/app/(cashier)/cashier/shift/page.tsx`:
    - In `loadAll()`, change `router.push('/login')` to `router.push('/cashier/start-shift')`.

  **Verify:** `cd app && npx tsc --noEmit` — no type errors.

---

- [ ] 11. **Web — full build verification**

  Run the Next.js build to confirm no page-level errors.

  **Files:** none.

  **Verify:** `cd app && npm run build` — exits 0 with no errors.

---

- [ ] 12. **Mobile — full TypeScript verification**

  Run a final TypeScript check across the entire mobile project.

  **Files:** none.

  **Verify:** `cd mobile && npx tsc --noEmit` — exits 0 with no errors.

---

## Cross-file dependency map

```
mobile/src/services/api.ts (401 interceptor)
  └── consumed by all cashierApi calls
mobile/src/store/authStore.tsx (startShift, no-logout restore)
  └── consumed by StartShiftScreen, EndShiftScreen, AppNavigator
mobile/src/screens/StartShiftScreen.tsx
  └── registered in AppNavigator.tsx
mobile/src/navigation/AppNavigator.tsx
  └── reads activeShift from authStore → switches between StartShift / Shift
mobile/src/screens/EndShiftScreen.tsx
  └── calls setActiveShift(null) → triggers AppNavigator to show StartShift

app/src/app/login/page.tsx (no auto shift-open)
  └── redirects to /cashier/start-shift
app/src/middleware.ts
  └── redirects authenticated /login to /cashier/start-shift
app/src/app/(cashier)/cashier/start-shift/page.tsx (new)
  └── uses openShift from cashierApi, getMyShifts, formatRupees/formatDate/formatTime
  └── logout from lib/auth
app/src/app/(cashier)/cashier/shift/page.tsx
  └── redirects to /cashier/start-shift when no active shift
app/src/app/(cashier)/cashier/end-shift/page.tsx
  └── redirects to /cashier/start-shift (no logout)
```

---

## Risks and notes

1. **Mobile startup when backend is offline**: After the fix in item 1, `restore()` will
   leave the user in an authenticated-but-no-shift state (token kept, `user` null if
   `/auth/me` failed). The `StartShiftScreen` "Start Shift" button will fail again with
   a network error, which is correct — the user can see the error and retry. The app
   will not silently log them out.

2. **Mobile token in SecureStore vs. in-memory user**: After item 1's fix, if the network
   is down at startup, `user` will be null and `isAuthenticated` will be false, so
   `AppNavigator` still shows the Login screen. This is acceptable — the token is
   preserved, so once the network comes back, re-entering credentials is the only step
   needed (no re-registration). An alternative would be caching the user object in
   SecureStore alongside the token; this can be a follow-up enhancement if needed.

3. **Web `/cashier/start-shift` not in middleware matcher**: Item 7 adds it. If missed,
   unauthenticated users would get a raw 404 instead of being redirected to `/login`.

4. **Web shift/page.tsx redirects to `/login` in two other places**: Search for
   `router.push('/login')` — there is one in the `loadAll` catch block. That one is
   covered by item 10. The 401 interceptor in `api.ts` handles the other global 401
   redirect; that is intentional and must not be removed.

5. **`EndShiftScreen` "Done" button flow (mobile)**: After item 4, pressing "Done"
   calls `setActiveShift(null)`. The `AppNavigator` will immediately switch the root
   stack to `StartShift`. React Navigation will animate the transition. Because
   `EndShift` is a child screen of the `Shift` stack, calling `setActiveShift(null)`
   while on `EndShift` may briefly show the Shift stack before the navigator re-renders.
   If this flicker is visible, wrap the `setActiveShift(null)` call in a
   `navigation.popToTop()` first — this pops back to the root before the state change
   lands, giving a clean transition.

6. **Web end-shift page "Done" button flow**: After item 9, pressing "Done" pushes to
   `/cashier/start-shift`. The start-shift page will call `getActiveShift()` on mount,
   find null (shift just ended), and show the StartShift UI with the previous shift
   summary. This is the correct experience.

7. **`getMyShifts()` on StartShift screens**: The previous-shift summary calls
   `getMyShifts()` with no date range arguments, which returns all shifts for the user
   sorted by the API's default order. Verify the API returns newest-first; if not, sort
   client-side by `shift_date` desc and pick index 0.
