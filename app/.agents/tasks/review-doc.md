# Cash-in returns, latest-entry balance, and new dashboard layout

This change adds a `cash_in_returns` table and full CRUD service for tracking partial returns against individual cash-out records. The `SUMMARY_SELECT` query in `shifts.service.ts` is refactored from a `LEFT JOIN transactions + GROUP BY` pattern to correlated subqueries, so only the *most recent* transaction entry contributes to `total_entries_cash` and `total_card` — matching the stated intent that cashiers count denominations multiple times and only the last count should be used. The balance formula becomes `opening_cash_in + latest_entry.cash_in - SUM(cash_outs) + SUM(cash_in_returns)`. Both dashboards (web and mobile) are updated to show four summary boxes (Opening Balance, Available Balance, Cash Out, Cash In) with a conditional net-bar below.

Watch for: The `GET /cashier/cash-in-returns` route does not scope the query to `user.userId`, so any authenticated cashier can read another cashier's return records by guessing a shift ID (confirmed). The `cash_balance` comment in both type files still describes the old formula — it no longer includes `cash_in_returns` in the annotation (confirmed). The runtime migration in `migrate.ts` uses a module-level `migrated` boolean that resets on every cold start/serverless invocation (likely).

**Verdict**: NEEDS_CHANGES

---

## High-level view

The correlated-subquery refactor in `SUMMARY_SELECT` correctly replaces `GROUP BY` aggregation with a single `LIMIT 1 ORDER BY created_at DESC` subquery for `total_entries_cash` and `total_card`, and a separate `SUM` subquery for `total_cash_out` and `total_cash_in_returns`. The design is deliberate and correct for the latest-count-only requirement, but it does mean four correlated subqueries execute per shift row, which could become a concern at scale.

The `cash_in_returns` service enforces three meaningful ownership invariants before inserting: the cash-out must exist, belong to the same shift, and belong to the same cashier. Deletes are guarded the same way. This is good discipline. The `GET` list endpoint, however, passes only `shiftId` to the database query with no cashier filter — any cashier token can retrieve returns for any shift ID.

Both migration files (the inline `migrate.ts` and the standalone `backend/database/migrations/migrate.ts`) include the `cash_in_returns` DDL and are in sync. The in-app `ensureMigrations` is idempotent, so either path to the first cold start works.

The dashboard layout matches the spec: Opening Balance and Available Balance on row one, Cash Out and Cash In (returns) on row two, net-bar when `total_cash_out > 0`. Both platforms implement the same formula: `max(0, total_cash_out - total_cash_in_returns)` for the net line. The "Cash In" label in the fourth box refers to cash-in *returns*, not the opening float — this is spec-correct but the label alone may confuse cashiers who expect "Cash In" to mean the opening count.

The `cash_balance` comment in the type files (`// opening_cash_in + total_entries_cash - total_cash_out`) no longer matches the actual SQL, which now also adds `cash_in_returns`. This is documentation drift, not a runtime bug, but it will mislead anyone reading the types.

---

<details>
<summary>Issues (4)</summary>

1. **GET returns endpoint leaks cross-cashier data** — `getCashInReturnsForShift(shiftId)` executes `SELECT * FROM cash_in_returns WHERE shift_id = $1` with no cashier filter. The route calls `requireRole(user, 'cashier')` but never passes `user.userId` to the service. Any cashier can probe another cashier's return records. Add a `cashier_id` parameter and a `WHERE shift_id = $1 AND cashier_id = $2` clause, and thread `user.userId` through the route.

2. **`cash_balance` comment is stale in both type files** — `app/src/lib/server/types.ts` and `app/src/types/index.ts` both annotate `cash_balance` as `opening_cash_in + total_entries_cash - total_cash_out`, omitting the `+ cash_in_returns` term that was added in this PR. Update the comment in both files to reflect the full formula.

3. **"Cash In" label ambiguity in dashboard** — The fourth summary box is labelled "Cash In" on both web and mobile, but its value is `total_cash_in_returns`, not the opening float. A cashier scanning the dashboard sees "Cash In" twice (section header for the opening float, and this box). Consider "Returns" or "Cash Returned" to avoid the confusion.

4. **`note` validation gap in POST route** — The cash-outs POST route returns 422 when `note` is blank. The cash-in-returns POST route passes `note ?? ''` to the service without any trim/empty check at the route level (the service does call `note.trim()`, but the 422 guard is absent). This is a minor inconsistency rather than a security gap, but aligns with the pattern established by the cash-outs route.

</details>

---

<details>
<summary>Details</summary>

### Correlated subqueries and the latest-entry semantic

The old `SUMMARY_SELECT` joined `transactions` with `GROUP BY` and took the max/sum over all entries. The new version uses:

```sql
(SELECT t_latest.cash_in FROM transactions t_latest
 WHERE t_latest.shift_id = s.id
 ORDER BY t_latest.created_at DESC LIMIT 1)
```

This is the right shape for the "last count wins" requirement. The same subquery runs twice in the `SELECT` list (`total_entries_cash` and `cash_balance`), which PostgreSQL's planner may or may not deduplicate — confirmed as functionally correct, potentially redundant work. No implicit aggregation or wrong-group problem introduced.

### Ownership gap in GET /cashier/cash-in-returns

The `GET` handler in `app/src/app/api/cashier/cash-in-returns/route.ts`:

```ts
const shiftId = request.nextUrl.searchParams.get('shift_id');
const returns = await getCashInReturnsForShift(shiftId);
```

`getCashInReturnsForShift` runs `SELECT * FROM cash_in_returns WHERE shift_id = $1` — no `cashier_id` filter. Compare with `getShiftCashOuts(id, user.userId)` in the cash-outs route, which does scope to the requesting cashier. The returns service is missing that second parameter entirely, so any valid cashier JWT can retrieve another cashier's returns. The `POST` and `DELETE` paths do the ownership check correctly; only `GET` is exposed.

### Balance formula and comment drift

The SQL `cash_balance` expression in `SUMMARY_SELECT` is:

```
opening_cash_in
+ (latest cash_in subquery)
- (SUM cash_outs subquery)
+ (SUM cash_in_returns subquery)
```

Both type files annotate it as `opening_cash_in + total_entries_cash - total_cash_out` — confirmed stale. The runtime value is correct; only the comment misleads.


</details>

---

<details>
<summary>File map</summary>

| File | Change |
|---|---|
| `app/src/lib/server/shifts.service.ts` | `SUMMARY_SELECT` rewritten to correlated subqueries; `total_cash_in_returns` added to balance formula |
| `app/src/lib/server/cash-in-returns.service.ts` | New — `addCashInReturn`, `deleteCashInReturn`, `getCashInReturnsForShift` |
| `app/src/lib/server/migrate.ts` | New — `ensureMigrations` for `cash_in_returns` DDL |
| `app/src/lib/server/types.ts` | `CashInReturn` type added; `total_cash_in_returns` field added to `ShiftSummary` |
| `app/src/app/api/cashier/cash-in-returns/route.ts` | New — `GET` (list by shift) and `POST` (add return) |
| `app/src/app/api/cashier/cash-in-returns/[id]/route.ts` | New — `DELETE` (remove return) |
| `app/src/types/index.ts` | `CashInReturn` type added; `total_cash_in_returns` field added to `Shift` |
| `app/src/lib/cashierApi.ts` | `addCashInReturn`, `deleteCashInReturn`, `getCashInReturnsForShift` client functions added |
| `app/src/app/(cashier)/cashier/shift/page.tsx` | Dashboard rebuilt with 4-box + net-bar; cash-in-returns UI added under each cash-out |
| `mobile/src/types/index.ts` | `CashInReturn` type added; `total_cash_in_returns` field added to `Shift` |
| `mobile/src/services/cashierApi.ts` | `addCashInReturn`, `deleteCashInReturn`, `getCashInReturnsForShift` client functions added |
| `mobile/src/screens/ShiftScreen.tsx` | Dashboard rebuilt with `BalBox` 4-box grid + net-bar; returns modal and inline return list added |
| `backend/database/migrations/migrate.ts` | `cash_in_returns` DDL added to standalone migration script |
| `app/.agents/tasks/plan.md` | Planning artifact (not production code) |

Full diff: `git diff HEAD~1` from `e:\work\cashdesk`

</details>
