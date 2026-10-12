# Implementation Plan

## Context

- **App**: Next.js 14 (TypeScript) at `e:\work\cashdesk\app`
- **Mobile**: React Native / Expo at `e:\work\cashdesk\mobile`
- **Backend migration**: standalone `ts-node` script at `e:\work\cashdesk\backend\database\migrations\migrate.ts`
- **Build**: `npm run build` (Next.js); no automated test suite — verify with TypeScript compile (`npx tsc --noEmit`)
- **Service pattern**: pool from `database.ts`, transactional helpers in `*service.ts`, Next.js Route Handlers in `app/api/cashier/`

---

## Change 1 — `cash_in_returns` table + backend feature

- [ ] 1. Append the `cash_in_returns` DDL to `MIGRATION_SQL` in the backend migration script.
      The new SQL block must be placed **before** the closing backtick of `MIGRATION_SQL` (after the `cash_outs` block).
      Paste exactly:
      ```sql
      -- CASH IN RETURNS
      CREATE TABLE IF NOT EXISTS cash_in_returns (
        id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        cash_out_id UUID          NOT NULL REFERENCES cash_outs(id) ON DELETE CASCADE,
        shift_id    UUID          NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
        cashier_id  UUID          NOT NULL REFERENCES users(id)  ON DELETE RESTRICT,
        amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
        note        VARCHAR(200)  NOT NULL DEFAULT '',
        created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_cash_in_returns_cash_out_id ON cash_in_returns(cash_out_id);
      CREATE INDEX IF NOT EXISTS idx_cash_in_returns_shift_id    ON cash_in_returns(shift_id);
      ```
      Files: `e:\work\cashdesk\backend\database\migrations\migrate.ts`
      Verify: `npx tsc --noEmit` in `e:\work\cashdesk\backend` passes (no TypeScript errors).

- [ ] 2. Add the `CashInReturn` interface and `total_cash_in_returns` to the server-side types.
      In `types.ts`, after the `CashOut` interface, add:
      ```ts
      export interface CashInReturn {
        id: string;
        cash_out_id: string;
        shift_id: string;
        cashier_id: string;
        amount: number;
        note: string;
        created_at: Date;
        updated_at: Date;
      }
      ```
      In `ShiftSummary`, add after `cash_out_count`:
      ```ts
      total_cash_in_returns: number;
      ```
      Files: `e:\work\cashdesk\app\src\lib\server\types.ts`
      Verify: `npx tsc --noEmit` in `e:\work\cashdesk\app` passes.

- [ ] 3. Add `CashInReturn` interface and `total_cash_in_returns` to both frontend type files.
      **Web** (`e:\work\cashdesk\app\src\types\index.ts`): after the `CashOut` interface add:
      ```ts
      export interface CashInReturn {
        id: string;
        cash_out_id: string;
        shift_id: string;
        cashier_id: string;
        amount: number;
        note: string;
        created_at: string;
        updated_at: string;
      }
      ```
      In `Shift`, add `total_cash_in_returns: number;` after `cash_out_count`.

      **Mobile** (`e:\work\cashdesk\mobile\src\types\index.ts`): same interface (strings for dates), same `total_cash_in_returns: number` field on `Shift`.
      Files: `e:\work\cashdesk\app\src\types\index.ts`, `e:\work\cashdesk\mobile\src\types\index.ts`
      Verify: `npx tsc --noEmit` in both `e:\work\cashdesk\app` and `e:\work\cashdesk\mobile` passes.

- [ ] 4. Create the `cash-in-returns.service.ts` server service.
      Model it exactly after `cash-outs.service.ts`. Implement three exports:

      **`addCashInReturn(cashOutId, shiftId, cashierId, amount, note)`**
      - `BEGIN` transaction
      - Verify that `cash_outs` row exists with `id = cashOutId AND shift_id = shiftId AND cashier_id = cashierId`; throw `'Cash out not found or access denied.'` if not
      - Verify `shifts.status = 'active'` for `shiftId`; throw `'Shift is not active.'` if not
      - `INSERT INTO cash_in_returns ... RETURNING *`
      - `COMMIT`, return the new row

      **`deleteCashInReturn(id, cashierId)`**
      - `BEGIN` transaction
      - Verify `cash_in_returns` row exists with `cashier_id = cashierId`; throw `'Not found or permission denied.'` if not
      - `DELETE FROM cash_in_returns WHERE id = $1`
      - `COMMIT`

      **`getCashInReturnsForShift(shiftId)`**
      - `SELECT * FROM cash_in_returns WHERE shift_id = $1 ORDER BY created_at ASC`
      - Return rows

      Return type is `CashInReturn` (imported from `./types`).
      Files: `e:\work\cashdesk\app\src\lib\server\cash-in-returns.service.ts` *(new file)*
      Verify: `npx tsc --noEmit` in `e:\work\cashdesk\app` passes.

- [ ] 5. Create the two new API route handlers.

      **`route.ts`** — `POST` (add return) + `GET` (list by shift):
      - `POST /cashier/cash-in-returns`: body `{ cash_out_id, shift_id, amount, note }`, calls `addCashInReturn`, returns 201
      - `GET /cashier/cash-in-returns?shift_id=…`: calls `getCashInReturnsForShift(shift_id)`, returns 200
      - Auth: `requireAuth` + `requireRole(user, 'cashier')`
      - Same `errorStatus` helper as in `cash-outs/route.ts`

      **`[id]/route.ts`** — `DELETE`:
      - `DELETE /cashier/cash-in-returns/:id`: calls `deleteCashInReturn(id, user.userId)`, returns 200
      - Auth + error handling same as `cash-outs/[id]/route.ts`

      Files:
      - `e:\work\cashdesk\app\src\app\api\cashier\cash-in-returns\route.ts` *(new)*
      - `e:\work\cashdesk\app\src\app\api\cashier\cash-in-returns\[id]\route.ts` *(new)*
      Verify: `npx tsc --noEmit` in `e:\work\cashdesk\app` passes.

- [ ] 6. Add three `cashInReturn` functions to the **web** `cashierApi.ts`.
      After the `getShiftCashOuts` function, add:
      ```ts
      // ─── Cash In Returns ──────────────────────────────────────────────────────────

      export async function addCashInReturn(
        cashOutId: string, shiftId: string, amount: number, note: string,
      ): Promise<CashInReturn> {
        const res = await api.post<ApiResponse<CashInReturn>>('/cashier/cash-in-returns', {
          cash_out_id: cashOutId, shift_id: shiftId, amount, note,
        });
        return res.data.data!;
      }

      export async function deleteCashInReturn(id: string): Promise<void> {
        await api.delete(`/cashier/cash-in-returns/${id}`);
      }

      export async function getCashInReturnsForShift(shiftId: string): Promise<CashInReturn[]> {
        const res = await api.get<ApiResponse<CashInReturn[]>>('/cashier/cash-in-returns', {
          params: { shift_id: shiftId },
        });
        return res.data.data ?? [];
      }
      ```
      Also add `CashInReturn` to the import from `'../types'` at the top of the file.
      Files: `e:\work\cashdesk\app\src\lib\cashierApi.ts`
      Verify: `npx tsc --noEmit` in `e:\work\cashdesk\app` passes.

- [ ] 7. Add three `cashInReturn` functions to the **mobile** `cashierApi.ts`.
      Same three functions as above, copying the pattern from the existing mobile cash-out functions.
      Also add `CashInReturn` to the import from `'../types'` at the top of the file.
      Files: `e:\work\cashdesk\mobile\src\services\cashierApi.ts`
      Verify: `npx tsc --noEmit` in `e:\work\cashdesk\mobile` passes.

---

## Change 2 — Only the latest entry counts toward balance

- [ ] 8. Replace `SUMMARY_SELECT` and remove all `GROUP BY` clauses in `shifts.service.ts`.
      Replace the entire `SUMMARY_SELECT` constant (lines starting `const SUMMARY_SELECT` through the closing backtick) with the new version below. The new query uses correlated subqueries so there is no `LEFT JOIN transactions` and no aggregation in the main `SELECT`.

      ```ts
      const SUMMARY_SELECT = `
        SELECT
          s.*,
          u.name        AS cashier_name,
          u.username    AS cashier_username,
          -- LATEST entry cash (denominations total from most recent transaction only)
          COALESCE((
            SELECT t_latest.cash_in
            FROM transactions t_latest
            WHERE t_latest.shift_id = s.id
            ORDER BY t_latest.created_at DESC
            LIMIT 1
          ), 0) AS total_entries_cash,
          -- LATEST entry card amount
          COALESCE((
            SELECT t_latest.card_amount
            FROM transactions t_latest
            WHERE t_latest.shift_id = s.id
            ORDER BY t_latest.created_at DESC
            LIMIT 1
          ), 0) AS total_card,
          -- sum of all cash outs (unchanged)
          COALESCE((
            SELECT SUM(co.amount) FROM cash_outs co WHERE co.shift_id = s.id
          ), 0) AS total_cash_out,
          -- sum of all cash in returns (NEW)
          COALESCE((
            SELECT SUM(cir.amount) FROM cash_in_returns cir WHERE cir.shift_id = s.id
          ), 0) AS total_cash_in_returns,
          -- new balance: opening + latest_cash - cash_out + cash_in_returns
          s.opening_cash_in
          + COALESCE((
            SELECT t_l.cash_in FROM transactions t_l WHERE t_l.shift_id = s.id ORDER BY t_l.created_at DESC LIMIT 1
          ), 0)
          - COALESCE((
            SELECT SUM(co.amount) FROM cash_outs co WHERE co.shift_id = s.id
          ), 0)
          + COALESCE((
            SELECT SUM(cir.amount) FROM cash_in_returns cir WHERE cir.shift_id = s.id
          ), 0) AS cash_balance,
          -- entry_count still counts ALL entries
          (SELECT COUNT(*) FROM transactions WHERE shift_id = s.id) AS entry_count,
          COALESCE((
            SELECT COUNT(*) FROM cash_outs co WHERE co.shift_id = s.id
          ), 0) AS cash_out_count
        FROM shifts s
        JOIN users u ON u.id = s.cashier_id
      `;
      ```

      Then remove `GROUP BY s.id, u.name, u.username` from every query that appends it. There are five call sites to update:
      1. `getActiveShift` — remove `GROUP BY s.id, u.name, u.username` from the WHERE string
      2. `updateOpeningCashIn` — remove `GROUP BY s.id, u.name, u.username`
      3. `endShift` — remove `GROUP BY s.id, u.name, u.username`
      4. `getCashierShifts` — remove `GROUP BY s.id, u.name, u.username` from the ORDER BY string
      5. `getAllShifts` — remove `GROUP BY s.id, u.name, u.username` from the ORDER BY string
      6. `getShiftById` — remove `GROUP BY s.id, u.name, u.username`

      Files: `e:\work\cashdesk\app\src\lib\server\shifts.service.ts`
      Verify: `npx tsc --noEmit` in `e:\work\cashdesk\app` passes. Also run `npm run build` to confirm Next.js compiles cleanly.

---

## Change 3 — Dashboard layout (web + mobile)

- [ ] 9. Rewrite the balance summary strip and add Cash In Returns UI to the Cash Out section in the **web** shift page.

      **Summary strip** — replace the existing `<div className="grid grid-cols-2 gap-2">` block (the four `SummaryBox` calls) with:
      ```tsx
      {/* Row 1: Opening Balance | Available Balance */}
      <div className="grid grid-cols-2 gap-2">
        <SummaryBox label="Opening Balance"   value={formatRupees(shift?.opening_cash_in ?? 0)}  color="emerald" />
        <SummaryBox label="Available Balance" value={formatRupees(shift?.cash_balance ?? 0)}      color="blue" />
      </div>
      {/* Row 2: Cash Out | Cash In (returns) */}
      <div className="grid grid-cols-2 gap-2">
        <SummaryBox label="Cash Out" value={formatRupees(shift?.total_cash_out ?? 0)}          color="red" />
        <SummaryBox label="Cash In"  value={formatRupees(shift?.total_cash_in_returns ?? 0)}   color="emerald" />
      </div>
      {/* Row 3: Net Cash Out bar — only when total_cash_out > 0 */}
      {(shift?.total_cash_out ?? 0) > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-xs text-red-700 font-medium">
          Net Cash Out: {formatRupees((shift?.total_cash_out ?? 0) - (shift?.total_cash_in_returns ?? 0))}
        </div>
      )}
      ```
      Do NOT remove the "Cash In" section below (the opening float editor — SECTION 1).

      **Cash In Returns state** — add these state variables after the `cashOuts` state declarations:
      ```ts
      const [cashInReturns,   setCashInReturns]   = useState<Record<string, CashInReturn[]>>({});
      const [showReturnForm,  setShowReturnForm]  = useState<string | null>(null); // cashOutId
      const [returnAmount,    setReturnAmount]    = useState('');
      const [returnNote,      setReturnNote]      = useState('');
      const [returnSaving,    setReturnSaving]    = useState(false);
      ```

      **`loadAll` update** — after `setCashOuts(outs)`, add:
      ```ts
      const returns = await getCashInReturnsForShift(s.id);
      const returnMap: Record<string, CashInReturn[]> = {};
      returns.forEach((r) => {
        if (!returnMap[r.cash_out_id]) returnMap[r.cash_out_id] = [];
        returnMap[r.cash_out_id].push(r);
      });
      setCashInReturns(returnMap);
      ```

      **`handleSaveReturn(cashOutId)`** — new async function:
      ```ts
      async function handleSaveReturn(cashOutId: string) {
        if (!shift) return;
        const amt = parseFloat(returnAmount);
        if (isNaN(amt) || amt <= 0) { toast.error('Enter a valid amount.'); return; }
        setReturnSaving(true);
        try {
          const created = await addCashInReturn(cashOutId, shift.id, amt, returnNote.trim());
          setCashInReturns((prev) => ({
            ...prev,
            [cashOutId]: [...(prev[cashOutId] ?? []), created],
          }));
          setShowReturnForm(null);
          setReturnAmount('');
          setReturnNote('');
          await refreshShift();
          toast.success('Cash in return saved.');
        } catch (err) {
          toast.error(getApiErrorMessage(err));
        } finally {
          setReturnSaving(false);
        }
      }
      ```

      **`handleDeleteReturn(returnId, cashOutId)`** — new async function:
      ```ts
      async function handleDeleteReturn(returnId: string, cashOutId: string) {
        setConfirmModal({
          message: 'Delete this cash in return? This cannot be undone.',
          onConfirm: async () => {
            setConfirmModal(null);
            try {
              await deleteCashInReturn(returnId);
              setCashInReturns((prev) => ({
                ...prev,
                [cashOutId]: (prev[cashOutId] ?? []).filter((r) => r.id !== returnId),
              }));
              await refreshShift();
              toast.success('Deleted.');
            } catch (err) {
              toast.error(getApiErrorMessage(err));
            }
          },
        });
      }
      ```

      **Cash Out list** — inside the `cashOuts.map` loop, after the existing card content, add returns list + add-return button + inline form:
      ```tsx
      {/* Returns under this cash out */}
      {(cashInReturns[co.id] ?? []).map((r) => (
        <div key={r.id} className="mt-2 flex items-center justify-between gap-2 text-xs bg-emerald-50 rounded-lg px-3 py-1.5">
          <span className="text-emerald-700 font-semibold tabular-nums">{formatRupees(r.amount)}</span>
          {r.note && <span className="text-gray-500 truncate flex-1 ml-2">{r.note}</span>}
          {isActive && (
            <button onClick={() => handleDeleteReturn(r.id, co.id)}
              className="text-red-400 hover:text-red-600 text-xs font-medium ml-1">✕</button>
          )}
        </div>
      ))}
      {/* Inline return form */}
      {showReturnForm === co.id ? (
        <div className="mt-2 space-y-2 border-t border-gray-100 pt-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">₹</span>
              <DecimalInput
                min="0" value={returnAmount}
                onChange={(e) => setReturnAmount(e.target.value)}
                placeholder="0.00"
                className="input pl-5 text-sm font-semibold py-1.5"
                autoFocus
              />
            </div>
            <input type="text" value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
              placeholder="Note" className="input text-sm py-1.5 flex-1" maxLength={200} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleSaveReturn(co.id)} disabled={returnSaving}
              className="btn-sm btn-primary flex-1 text-xs">
              {returnSaving ? <><span className="spinner" /> Saving…</> : 'Save'}
            </button>
            <button onClick={() => { setShowReturnForm(null); setReturnAmount(''); setReturnNote(''); }}
              className="btn-sm btn-secondary text-xs">Cancel</button>
          </div>
        </div>
      ) : isActive && (
        <button onClick={() => { setShowReturnForm(co.id); setReturnAmount(''); setReturnNote(''); }}
          className="mt-2 text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1">
          <IconPlus size={11} /> Add Return
        </button>
      )}
      ```

      **Imports** — add `addCashInReturn, deleteCashInReturn, getCashInReturnsForShift` to the import from `'@/lib/cashierApi'`, and add `CashInReturn` to the import from `'@/types'`.

      Files: `e:\work\cashdesk\app\src\app\(cashier)\cashier\shift\page.tsx`
      Verify: `npx tsc --noEmit` in `e:\work\cashdesk\app` passes, then `npm run build` succeeds.

- [ ] 10. Rewrite the balance grid and add Cash In Returns UI to the Cash Out section in the **mobile** ShiftScreen.

      **Balance grid** — replace the existing `<View style={s.balanceGrid}>` block (the four `BalBox` calls) with:
      ```tsx
      <View style={s.balanceGrid}>
        {/* Row 1 */}
        <BalBox label="Opening Balance"   value={formatRupees(toNum(activeShift.opening_cash_in))} color="#16a34a" />
        <BalBox label="Available Balance" value={formatRupees(toNum(activeShift.cash_balance))}    color="#1d4ed8" />
        {/* Row 2 */}
        <BalBox label="Cash Out" value={formatRupees(toNum(activeShift.total_cash_out))}           color="#dc2626" />
        <BalBox label="Cash In"  value={formatRupees(toNum(activeShift.total_cash_in_returns))}    color="#16a34a" />
      </View>
      {/* Row 3: Net Cash Out — only when total_cash_out > 0 */}
      {toNum(activeShift.total_cash_out) > 0 && (
        <View style={{ backgroundColor: '#fef2f2', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: '#b91c1c', fontWeight: '600' }}>
            Net Cash Out: {formatRupees(toNum(activeShift.total_cash_out) - toNum(activeShift.total_cash_in_returns))}
          </Text>
        </View>
      )}
      ```
      Remove the line `const totalCashIn = toNum(activeShift.opening_cash_in) + toNum(activeShift.total_entries_cash);` since it is no longer used.

      **Cash In Returns state** — add after the `cashOuts` state:
      ```ts
      const [cashInReturns,  setCashInReturns]  = useState<Record<string, CashInReturn[]>>({});
      const [returnForCashOut, setReturnForCashOut] = useState<string | null>(null); // cashOutId
      const [returnAmount,   setReturnAmount]   = useState('');
      const [returnNote,     setReturnNote]     = useState('');
      const [returnSaving,   setReturnSaving]   = useState(false);
      ```

      **`loadData` update** — after `setCashOuts(outs)`, add:
      ```ts
      const returns = await getCashInReturnsForShift(activeShift.id);
      const returnMap: Record<string, CashInReturn[]> = {};
      returns.forEach((r) => {
        if (!returnMap[r.cash_out_id]) returnMap[r.cash_out_id] = [];
        returnMap[r.cash_out_id].push(r);
      });
      setCashInReturns(returnMap);
      ```

      **`handleSaveReturn(cashOutId)`** — new async function:
      ```ts
      async function handleSaveReturn(cashOutId: string) {
        if (!activeShift) return;
        const amt = parseFloat(returnAmount);
        if (isNaN(amt) || amt <= 0) { Alert.alert('Invalid', 'Enter a valid amount.'); return; }
        setReturnSaving(true);
        try {
          const created = await addCashInReturn(cashOutId, activeShift.id, amt, returnNote.trim());
          setCashInReturns((prev) => ({
            ...prev,
            [cashOutId]: [...(prev[cashOutId] ?? []), created],
          }));
          setReturnForCashOut(null);
          setReturnAmount('');
          setReturnNote('');
          await refreshShift();
        } catch (err) { Alert.alert('Error', getApiErrorMessage(err)); }
        finally { setReturnSaving(false); }
      }
      ```

      **`handleDeleteReturn(returnId, cashOutId)`** — new async function:
      ```ts
      function handleDeleteReturn(returnId: string, cashOutId: string) {
        setConfirm({
          message: 'Delete this cash in return? This cannot be undone.',
          onConfirm: async () => {
            setConfirm(null);
            try {
              await deleteCashInReturn(returnId);
              setCashInReturns((prev) => ({
                ...prev,
                [cashOutId]: (prev[cashOutId] ?? []).filter((r) => r.id !== returnId),
              }));
              await refreshShift();
            } catch (err) { Alert.alert('Error', getApiErrorMessage(err)); }
          },
        });
      }
      ```

      **Cash Out list** — inside `cashOuts.map`, after the existing `<View key={co.id} style={s.listCard}>` card content, add:
      ```tsx
      {/* Returns under this cash out */}
      {(cashInReturns[co.id] ?? []).map((r) => (
        <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 6 }}>
          <Text style={{ fontSize: 12, color: '#15803d', fontWeight: '700', flex: 1 }}>{formatRupees(r.amount)}</Text>
          {!!r.note && <Text style={{ fontSize: 11, color: '#6b7280', flex: 2, marginHorizontal: 6 }} numberOfLines={1}>{r.note}</Text>}
          <TouchableOpacity onPress={() => handleDeleteReturn(r.id, co.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      ))}
      {/* + Add Return button (active shifts only) */}
      {activeShift.status === 'active' && (
        <TouchableOpacity
          style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
          onPress={() => { setReturnForCashOut(co.id); setReturnAmount(''); setReturnNote(''); }}
          activeOpacity={0.7}>
          <Ionicons name="add-circle-outline" size={16} color="#16a34a" />
          <Text style={{ fontSize: 12, color: '#16a34a', fontWeight: '600' }}>Add Return</Text>
        </TouchableOpacity>
      )}
      ```

      **Add Return Modal** — add a new `<Modal>` after the Cash Out Modal, following the exact same pattern (SafeAreaView > modalHeader > ScrollView > fields > save button):
      ```tsx
      <Modal visible={!!returnForCashOut} animationType="slide" onRequestClose={() => setReturnForCashOut(null)}>
        <SafeAreaView style={s.safe}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setReturnForCashOut(null)}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
            <Text style={s.modalTitle}>Add Return</Text>
            <View style={{ width: 32 }} />
          </View>
          <ScrollView style={s.scroll} contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={s.fieldLabel}>Amount *</Text>
            <View style={[s.amtRow, { marginBottom: 16 }]}>
              <Text style={s.rupeeSign}>₹</Text>
              <TextInput style={[s.amtInput, { flex: 1, fontSize: 28 }]}
                value={returnAmount} onChangeText={setReturnAmount}
                keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#d1d5db" autoFocus />
            </View>
            <Text style={s.fieldLabel}>Note</Text>
            <TextInput style={s.textInput} value={returnNote} onChangeText={setReturnNote}
              placeholder="e.g. Change returned…" placeholderTextColor="#9ca3af" maxLength={200} />
            <TouchableOpacity
              style={[s.btn, s.btnPrimary, { marginTop: 24, backgroundColor: '#16a34a' }]}
              onPress={() => returnForCashOut && handleSaveReturn(returnForCashOut)}
              disabled={returnSaving} activeOpacity={0.85}>
              {returnSaving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.btnPrimaryText}>Save Return</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      ```

      **Imports** — add `addCashInReturn, deleteCashInReturn, getCashInReturnsForShift` to the import from `'../services/cashierApi'`, and add `CashInReturn` to the import from `'../types'`.

      Files: `e:\work\cashdesk\mobile\src\screens\ShiftScreen.tsx`
      Verify: `npx tsc --noEmit` in `e:\work\cashdesk\mobile` passes.

---

## Dependency order note

Items must be implemented in numerical order: types (2–3) before service (4) before routes (5) before API clients (6–7). The dashboard changes (9–10) depend on the type additions from items 2–3 and the API client additions from items 6–7.
