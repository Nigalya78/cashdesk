import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Modal, RefreshControl,
  Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOX_WIDTH = (SCREEN_WIDTH - 48) / 2;
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useAuth } from '../store/authStore';
import {
  getShiftEntries, getShiftCashOuts,
  createEntry, updateEntry, deleteEntry,
  createCashOut, updateCashOut, deleteCashOut,
  updateCashIn, DenomInput,
  addCashInReturn, deleteCashInReturn, getCashInReturnsForShift,
} from '../services/cashierApi';
import { getApiErrorMessage } from '../services/api';
import { formatRupees, formatDate, formatTime, getGreeting, computeCashTotal, toNum } from '../utils/format';
import { Entry, CashOut, CashInReturn } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'Shift'>;

const DENOMS = [500, 200, 100, 50, 20, 10, 5, 2, 1] as const;

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ visible, message, onConfirm, onCancel }: {
  visible: boolean; message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={cd.overlay}>
        <View style={cd.box}>
          <Text style={cd.msg}>{message}</Text>
          <View style={cd.row}>
            <TouchableOpacity style={cd.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
              <Text style={cd.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <View style={{ width: 10 }} />
            <TouchableOpacity style={cd.deleteBtn} onPress={onConfirm} activeOpacity={0.8}>
              <Text style={cd.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const cd = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', padding: 16 },
  box:       { backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  msg:       { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 18 },
  row:       { flexDirection: 'row' },
  cancelBtn: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelText:{ fontSize: 14, fontWeight: '600', color: '#374151' },
  deleteBtn: { flex: 1, backgroundColor: '#dc2626', borderRadius: 12, padding: 14, alignItems: 'center' },
  deleteText:{ fontSize: 14, fontWeight: '700', color: '#fff' },
});

// ─── Balance Box ──────────────────────────────────────────────────────────────
function BalBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={bb.box}>
      <Text style={bb.label}>{label}</Text>
      <Text style={[bb.value, { color }]}>{value}</Text>
    </View>
  );
}
const bb = StyleSheet.create({
  box:   { width: BOX_WIDTH, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, marginBottom: 8 },
  label: { fontSize: 11, color: '#6b7280', marginBottom: 3 },
  value: { fontSize: 16, fontWeight: '800' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ShiftScreen({ navigation }: Props) {
  const { activeShift, refreshShift, user } = useAuth();

  const [entries,    setEntries]    = useState<Entry[]>([]);
  const [cashOuts,   setCashOuts]   = useState<CashOut[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [cashInReturns,    setCashInReturns]    = useState<Record<string, CashInReturn[]>>({});
  const [returnForCashOut, setReturnForCashOut] = useState<string | null>(null);
  const [returnAmount,     setReturnAmount]     = useState('');
  const [returnNote,       setReturnNote]       = useState('');
  const [returnSaving,     setReturnSaving]     = useState(false);

  const [cashInEditing, setCashInEditing] = useState(false);
  const [cashInValue,   setCashInValue]   = useState('');
  const [cashInSaving,  setCashInSaving]  = useState(false);

  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntry,  setEditingEntry]  = useState<Entry | null>(null);
  const [entryName,     setEntryName]     = useState('');
  const [denomQtys,     setDenomQtys]     = useState<Record<number, string>>({});
  const [cardAmt,       setCardAmt]       = useState('');
  const [entrySaving,   setEntrySaving]   = useState(false);

  const [showCashOutForm, setShowCashOutForm] = useState(false);
  const [editingCashOut,  setEditingCashOut]  = useState<CashOut | null>(null);
  const [coAmount,        setCoAmount]        = useState('');
  const [coNote,          setCoNote]          = useState('');
  const [coSaving,        setCoSaving]        = useState(false);

  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const cashTotal = computeCashTotal(
    DENOMS.map((d) => ({ denomination: d, quantity: denomQtys[d] ?? '' }))
  );

  const loadData = useCallback(async () => {
    if (!activeShift) return;
    const [ent, outs] = await Promise.all([
      getShiftEntries(activeShift.id),
      getShiftCashOuts(activeShift.id),
    ]);
    setEntries(ent);
    setCashOuts(outs);
    const returns = await getCashInReturnsForShift(activeShift.id);
    const returnMap: Record<string, CashInReturn[]> = {};
    returns.forEach((r) => {
      if (!returnMap[r.cash_out_id]) returnMap[r.cash_out_id] = [];
      returnMap[r.cash_out_id].push(r);
    });
    setCashInReturns(returnMap);
  }, [activeShift]);

  useEffect(() => {
    loadData();
    if (activeShift) {
      setCashInValue(activeShift.opening_cash_in > 0 ? String(activeShift.opening_cash_in) : '');
    }
  }, [loadData, activeShift]);

  async function onRefresh() {
    setRefreshing(true);
    await refreshShift();
    await loadData();
    setRefreshing(false);
  }

  // ── Cash In ───────────────────────────────────────────────────────────────
  async function handleSaveCashIn() {
    if (!activeShift) return;
    const amt = parseFloat(cashInValue);
    if (isNaN(amt) || amt < 0) { Alert.alert('Invalid', 'Enter a valid amount.'); return; }
    setCashInSaving(true);
    try {
      await updateCashIn(activeShift.id, amt);
      await refreshShift();
      setCashInEditing(false);
    } catch (err) { Alert.alert('Error', getApiErrorMessage(err)); }
    finally { setCashInSaving(false); }
  }

  // ── Entries ───────────────────────────────────────────────────────────────
  function openNewEntry() {
    setEditingEntry(null); setEntryName(''); setDenomQtys({}); setCardAmt('');
    setShowEntryForm(true);
  }

  function openEditEntry(entry: Entry) {
    setEditingEntry(entry);
    setEntryName(entry.entry_name);
    const qtys: Record<number, string> = {};
    entry.denominations.forEach((d) => { qtys[d.denomination] = String(d.quantity); });
    setDenomQtys(qtys);
    setCardAmt(entry.card_amount > 0 ? String(entry.card_amount) : '');
    setShowEntryForm(true);
  }

  async function handleSaveEntry() {
    if (!activeShift) return;
    if (!entryName.trim()) { Alert.alert('Required', 'Entry name is required.'); return; }
    const card = parseFloat(cardAmt) || 0;
    if (cashTotal === 0 && card === 0) {
      Alert.alert('Required', 'Enter at least one denomination or card amount.'); return;
    }
    const denoms: DenomInput[] = DENOMS
      .map((d) => ({ denomination: d, quantity: parseInt(denomQtys[d] ?? '0') || 0 }))
      .filter((d) => d.quantity > 0);
    setEntrySaving(true);
    try {
      if (editingEntry) {
        const allDenoms: DenomInput[] = DENOMS.map((d) => ({
          denomination: d, quantity: parseInt(denomQtys[d] ?? '0') || 0,
        }));
        const updated = await updateEntry(editingEntry.id, entryName.trim(), allDenoms, card);
        setEntries((prev) => prev.map((e) => e.id === updated.id ? updated : e));
      } else {
        const created = await createEntry(activeShift.id, entryName.trim(), denoms, card);
        setEntries((prev) => [...prev, created]);
      }
      await refreshShift();
      setShowEntryForm(false);
    } catch (err) { Alert.alert('Error', getApiErrorMessage(err)); }
    finally { setEntrySaving(false); }
  }

  function handleDeleteEntry(entryId: string) {
    setConfirm({
      message: 'Are you sure you want to delete this entry? This cannot be undone.',
      onConfirm: async () => {
        setConfirm(null);
        try {
          await deleteEntry(entryId);
          setEntries((prev) => prev.filter((e) => e.id !== entryId));
          await refreshShift();
        } catch (err) { Alert.alert('Error', getApiErrorMessage(err)); }
      },
    });
  }

  // ── Cash Outs ─────────────────────────────────────────────────────────────
  function openNewCashOut() {
    setEditingCashOut(null); setCoAmount(''); setCoNote('');
    setShowCashOutForm(true);
  }

  function openEditCashOut(co: CashOut) {
    setEditingCashOut(co); setCoAmount(String(co.amount)); setCoNote(co.note);
    setShowCashOutForm(true);
  }

  async function handleSaveCashOut() {
    if (!activeShift) return;
    const amt = parseFloat(coAmount);
    if (isNaN(amt) || amt <= 0) { Alert.alert('Invalid', 'Enter a valid amount.'); return; }
    if (!coNote.trim()) { Alert.alert('Required', 'Note is required.'); return; }
    setCoSaving(true);
    try {
      if (editingCashOut) {
        const updated = await updateCashOut(editingCashOut.id, amt, coNote.trim());
        setCashOuts((prev) => prev.map((c) => c.id === updated.id ? updated : c));
      } else {
        const created = await createCashOut(activeShift.id, amt, coNote.trim());
        setCashOuts((prev) => [...prev, created]);
      }
      await refreshShift();
      setShowCashOutForm(false);
    } catch (err) { Alert.alert('Error', getApiErrorMessage(err)); }
    finally { setCoSaving(false); }
  }

  function handleDeleteCashOut(cashOutId: string) {
    setConfirm({
      message: 'Are you sure you want to delete this cash out? This cannot be undone.',
      onConfirm: async () => {
        setConfirm(null);
        try {
          await deleteCashOut(cashOutId);
          setCashOuts((prev) => prev.filter((c) => c.id !== cashOutId));
          await refreshShift();
        } catch (err) { Alert.alert('Error', getApiErrorMessage(err)); }
      },
    });
  }

  async function handleSaveReturn() {
    if (!activeShift || !returnForCashOut) return;
    const amt = parseFloat(returnAmount);
    if (isNaN(amt) || amt <= 0) { Alert.alert('Invalid', 'Enter a valid amount.'); return; }
    setReturnSaving(true);
    try {
      const created = await addCashInReturn(returnForCashOut, activeShift.id, amt, returnNote.trim());
      setCashInReturns((prev) => ({
        ...prev,
        [returnForCashOut]: [...(prev[returnForCashOut] ?? []), created],
      }));
      setReturnForCashOut(null);
      setReturnAmount('');
      setReturnNote('');
      await refreshShift();
    } catch (err) { Alert.alert('Error', getApiErrorMessage(err)); }
    finally { setReturnSaving(false); }
  }

  function handleDeleteReturn(returnId: string, cashOutId: string) {
    setConfirm({
      message: 'Delete this cash in return?',
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

  if (!activeShift) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['left', 'right', 'bottom']}>
      <ConfirmDialog
        visible={!!confirm}
        message={confirm?.message ?? ''}
        onConfirm={confirm?.onConfirm ?? (() => {})}
        onCancel={() => setConfirm(null)}
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.greeting}>{getGreeting(user?.name ?? '')}</Text>
          <View style={s.shiftPill}>
            <View style={s.dot} />
            <Text style={s.pillText}>
              Shift Active · {formatDate(activeShift.shift_date)} · {formatTime(activeShift.login_time)}
            </Text>
          </View>
        </View>

        <View style={s.balanceGrid}>
          <BalBox label="Available Balance" value={formatRupees(toNum(activeShift.cash_balance))}          color="#1d4ed8" />
          <BalBox label="Opening Balance"   value={formatRupees(toNum(activeShift.opening_cash_in))}       color="#16a34a" />
          <BalBox label="Cash Out"          value={formatRupees(toNum(activeShift.total_cash_out))}        color="#dc2626" />
          <BalBox label="Cash In"           value={formatRupees(toNum(activeShift.total_cash_in_returns))} color="#16a34a" />
        </View>
        {toNum(activeShift.total_cash_out) > 0 && (
          <View style={s.netBar}>
            <Text style={s.netBarText}>Net Cash Out: {formatRupees(Math.max(0, toNum(activeShift.total_cash_out) - toNum(activeShift.total_cash_in_returns)))}</Text>
          </View>
        )}

        {/* ── OPENING BALANCE ──────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Opening Balance</Text>
            <Text style={s.sectionSub}>  Opening float</Text>
          </View>

          {cashInEditing ? (
            <View style={s.card}>
              <View style={s.amtRow}>
                <Text style={s.rupeeSign}>₹</Text>
                <TextInput
                  style={s.amtInput} value={cashInValue}
                  onChangeText={setCashInValue} keyboardType="decimal-pad"
                  placeholder="0.00" placeholderTextColor="#d1d5db" autoFocus
                />
              </View>
            <View style={s.btnRow}>
                <TouchableOpacity style={[s.btn, s.btnPrimary]}
                  onPress={handleSaveCashIn} disabled={cashInSaving} activeOpacity={0.85}>
                  {cashInSaving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.btnPrimaryText}>Save</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, s.btnSecondary, s.cancelBtn]}
                  onPress={() => setCashInEditing(false)} activeOpacity={0.85}>
                  <Text style={s.btnSecondaryText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[s.card, s.cashInDisplay]}>
              <Text style={s.cashInValue}>
                {toNum(activeShift.opening_cash_in) > 0 ? formatRupees(toNum(activeShift.opening_cash_in)) : 'Not set'}
              </Text>
              <TouchableOpacity style={s.editLink}
                onPress={() => { setCashInValue(toNum(activeShift.opening_cash_in) > 0 ? String(activeShift.opening_cash_in) : ''); setCashInEditing(true); }}
                activeOpacity={0.7}>
                <Text style={s.editLinkText}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── ENTRIES ──────────────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Entries</Text>
            <Text style={s.sectionSub}>  Denominations &amp; Card</Text>
          </View>

          <TouchableOpacity style={[s.btn, s.btnPrimary, s.addBtn]}
            onPress={openNewEntry} activeOpacity={0.85}>
            <Text style={s.btnPrimaryText}>+ New Entry</Text>
          </TouchableOpacity>

          {entries.map((entry) => (
            <View key={entry.id} style={s.listCard}>
              <View style={s.listCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.entryName}>
                    {entry.entry_name?.trim() ? entry.entry_name : `Entry at ${formatTime(entry.created_at)}`}
                  </Text>
                  <Text style={s.entrySub}>
                    Cash: {formatRupees(entry.cash_in)} · Card: {formatRupees(entry.card_amount)}
                  </Text>
                </View>
                <View style={s.actionRow}>
                  <TouchableOpacity onPress={() => openEditEntry(entry)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="pencil-outline" size={18} color="#2563eb" />
                  </TouchableOpacity>
                  <View style={{ width: 14 }} />
                  <TouchableOpacity onPress={() => handleDeleteEntry(entry.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
              {entry.denominations.length > 0 && (
                <View style={s.chips}>
                  {entry.denominations.map((d) => (
                    <View key={d.id} style={s.chip}>
                      <Text style={s.chipText}>₹{d.denomination}×{d.quantity}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* ── CASH OUTS ────────────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Cash Out</Text>
            <Text style={s.sectionSub}>  Expenses &amp; payments</Text>
          </View>

          <TouchableOpacity style={[s.btn, s.btnDanger, s.addBtn]}
            onPress={openNewCashOut} activeOpacity={0.85}>
            <Text style={s.btnPrimaryText}>+ New Cash Out</Text>
          </TouchableOpacity>

          {cashOuts.map((co) => (
            <View key={co.id} style={s.listCard}>
              <View style={s.listCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.entryName, { color: '#dc2626' }]}>{formatRupees(co.amount)}</Text>
                  <Text style={s.entrySub}>{co.note}</Text>
                </View>
                <View style={s.actionRow}>
                  <TouchableOpacity onPress={() => openEditCashOut(co)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="pencil-outline" size={18} color="#2563eb" />
                  </TouchableOpacity>
                  <View style={{ width: 14 }} />
                  <TouchableOpacity onPress={() => handleDeleteCashOut(co.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
              {/* Returns */}
              {(cashInReturns[co.id] ?? []).map((r) => (
                <View key={r.id} style={s.returnRow}>
                  <Text style={s.returnAmt}>+{formatRupees(r.amount)}</Text>
                  {r.note ? <Text style={s.returnNote}>{r.note}</Text> : null}
                  <TouchableOpacity onPress={() => handleDeleteReturn(r.id, co.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
              {/* Add Return */}
              <TouchableOpacity
                style={s.addReturnBtn}
                onPress={() => { setReturnForCashOut(co.id); setReturnAmount(''); setReturnNote(''); }}
                activeOpacity={0.7}
              >
                <Text style={s.addReturnText}>+ Add Return</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Nav */}
        <View style={s.navRow}>
          <TouchableOpacity style={[s.btn, s.btnSecondary, { flex: 1 }]}
            onPress={() => navigation.navigate('MyData')} activeOpacity={0.85}>
            <Text style={s.btnSecondaryText}>My Data</Text>
          </TouchableOpacity>
          <View style={{ width: 10 }} />
          <TouchableOpacity style={[s.btn, s.btnOutlineDanger, { flex: 1 }]}
            onPress={() => navigation.navigate('EndShift')} activeOpacity={0.85}>
            <Text style={s.btnDangerText}>End Shift</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Entry Modal ──────────────────────────────────────────────── */}
      <Modal visible={showEntryForm} animationType="slide" onRequestClose={() => setShowEntryForm(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowEntryForm(false)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
              <Text style={s.modalTitle}>{editingEntry ? 'Edit Entry' : 'New Entry'}</Text>
              <View style={{ width: 32 }} />
            </View>
          <ScrollView
            style={s.scroll}
            contentContainerStyle={[s.modalContent, { paddingBottom: 120 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.fieldLabel}>Entry Name *</Text>
            <TextInput style={s.textInput} value={entryName} onChangeText={setEntryName}
              placeholder="e.g. Morning Sales, Counter 1…" placeholderTextColor="#9ca3af" />

            <Text style={[s.fieldLabel, { marginTop: 16 }]}>Denominations</Text>
            <View style={s.denomTable}>
              <View style={s.denomRow}>
                <Text style={[s.denomCell, s.denomHead, { flex: 1.2 }]}>Note</Text>
                <Text style={[s.denomCell, s.denomHead, { flex: 1 }]}>Qty</Text>
                <Text style={[s.denomCell, s.denomHead, { flex: 1.5, textAlign: 'right' }]}>Amount</Text>
              </View>
              {DENOMS.map((denom) => {
                const qty  = parseInt(denomQtys[denom] ?? '') || 0;
                const line = denom * qty;
                return (
                  <View key={denom} style={[s.denomRow, qty > 0 && s.denomRowActive]}>
                    <Text style={[s.denomCell, s.denomLabel, { flex: 1.2 }]}>₹{denom}</Text>
                    <TextInput
                      style={[s.denomCell, s.denomInput, { flex: 1 }]}
                      value={denomQtys[denom] ?? ''}
                      onChangeText={(v) => setDenomQtys((prev) => ({ ...prev, [denom]: v.replace(/[^0-9]/g, '') }))}
                      keyboardType="numeric" placeholder="0" placeholderTextColor="#d1d5db"
                    />
                    <Text style={[s.denomCell, { flex: 1.5, textAlign: 'right', fontSize: 13, color: line > 0 ? '#16a34a' : '#d1d5db', fontWeight: '600' }]}>
                      {line > 0 ? formatRupees(line) : '—'}
                    </Text>
                  </View>
                );
              })}
              <View style={s.denomTotalRow}>
                <Text style={s.denomTotalLabel}>Cash Total</Text>
                <Text style={s.denomTotalValue}>{formatRupees(cashTotal)}</Text>
              </View>
            </View>

            <Text style={[s.fieldLabel, { marginTop: 16 }]}>Card Amount</Text>
            <View style={s.amtRow}>
              <Text style={s.rupeeSign}>₹</Text>
              <TextInput style={[s.amtInput, { flex: 1, fontSize: 18 }]}
                value={cardAmt} onChangeText={setCardAmt}
                keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#d1d5db" />
            </View>

            <TouchableOpacity style={[s.btn, s.btnPrimary, { marginTop: 24 }]}
              onPress={handleSaveEntry} disabled={entrySaving} activeOpacity={0.85}>
              {entrySaving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.btnPrimaryText}>{editingEntry ? 'Update Entry' : 'Save Entry'}</Text>}
            </TouchableOpacity>
          </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Cash Out Modal ────────────────────────────────────────────── */}
      <Modal visible={showCashOutForm} animationType="slide" onRequestClose={() => setShowCashOutForm(false)}>
        <SafeAreaView style={s.safe}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowCashOutForm(false)}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
            <Text style={s.modalTitle}>{editingCashOut ? 'Edit Cash Out' : 'New Cash Out'}</Text>
            <View style={{ width: 32 }} />
          </View>
          <ScrollView style={s.scroll} contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={s.fieldLabel}>Amount *</Text>
            <View style={[s.amtRow, { marginBottom: 16 }]}>
              <Text style={s.rupeeSign}>₹</Text>
              <TextInput style={[s.amtInput, { flex: 1, fontSize: 28 }]}
                value={coAmount} onChangeText={setCoAmount}
                keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#d1d5db" autoFocus />
            </View>

            <Text style={s.fieldLabel}>Note *</Text>
            <TextInput style={s.textInput} value={coNote} onChangeText={setCoNote}
              placeholder="e.g. Tea & snacks, Petrol…" placeholderTextColor="#9ca3af" />

            <TouchableOpacity style={[s.btn, s.btnDanger, { marginTop: 24 }]}
              onPress={handleSaveCashOut} disabled={coSaving} activeOpacity={0.85}>
              {coSaving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.btnPrimaryText}>{editingCashOut ? 'Update' : 'Save Cash Out'}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Return Modal ─────────────────────────────────────────────────── */}
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
              placeholder="Optional note…" placeholderTextColor="#9ca3af" />
            <TouchableOpacity style={[s.btn, s.btnPrimary, { marginTop: 24 }]}
              onPress={handleSaveReturn} disabled={returnSaving} activeOpacity={0.85}>
              {returnSaving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.btnPrimaryText}>Save Return</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#f9fafb' },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  header:      { marginBottom: 16 },
  greeting:    { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  shiftPill:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start' },
  dot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a', marginRight: 6 },
  pillText:    { fontSize: 11, fontWeight: '600', color: '#15803d' },

  balanceGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },

  section:       { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 },
  sectionTitle:  { fontSize: 15, fontWeight: '700', color: '#111827' },
  sectionSub:    { fontSize: 11, color: '#9ca3af' },

  card:          { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', padding: 16 },
  cashInDisplay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cashInValue:   { fontSize: 24, fontWeight: '800', color: '#16a34a' },
  editLink:      { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#eff6ff', borderRadius: 8 },
  editLinkText:  { fontSize: 13, fontWeight: '600', color: '#2563eb' },

  amtRow:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 12, paddingHorizontal: 14, backgroundColor: '#f9fafb' },
  rupeeSign: { fontSize: 20, fontWeight: '700', color: '#6b7280', marginRight: 4 },
  amtInput:  { paddingVertical: 14, fontSize: 24, fontWeight: '800', color: '#111827' },

  btnRow:     { flexDirection: 'column', marginTop: 12, gap: 8 },
  btn:        { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  btnPrimary: { backgroundColor: '#2563eb' },
  btnSecondary:    { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  btnDanger:       { backgroundColor: '#dc2626' },
  btnOutlineDanger:{ borderWidth: 1.5, borderColor: '#fca5a5' },
  btnPrimaryText:  { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnSecondaryText:{ color: '#374151', fontSize: 15, fontWeight: '600' },
  btnDangerText:   { color: '#dc2626', fontSize: 15, fontWeight: '600' },
  cancelBtn:       { minHeight: 48 },
  addBtn:          { marginBottom: 10 },

  listCard:    { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, marginBottom: 8 },
  listCardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  entryName:   { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  entrySub:    { fontSize: 12, color: '#6b7280' },
  actionRow:   { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },


  chips:    { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  chip:     { backgroundColor: '#eff6ff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6, marginBottom: 4 },
  chipText: { fontSize: 11, color: '#1d4ed8', fontWeight: '600' },

  navRow: { flexDirection: 'row', marginTop: 8 },

  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },

  modalTitle:   { fontSize: 16, fontWeight: '700', color: '#111827' },
  modalContent: { padding: 16, paddingBottom: 48 },
  fieldLabel:   { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  textInput:    { borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb' },

  denomTable:     { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  denomRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  denomRowActive: { backgroundColor: '#f0fdf4' },
  denomHead:      { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' },
  denomLabel:     { fontSize: 14, fontWeight: '600', color: '#374151' },
  denomInput:     { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, fontSize: 15, textAlign: 'center', color: '#111827', backgroundColor: '#f9fafb' },
  denomCell:      { paddingVertical: 2 },
  denomTotalRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#f0fdf4' },
  denomTotalLabel:{ fontSize: 13, fontWeight: '700', color: '#374151' },
  denomTotalValue:{ fontSize: 18, fontWeight: '800', color: '#111827' },

  netBar:     { backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  netBarText: { fontSize: 13, color: '#374151', fontWeight: '600' },

  returnRow:    { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  returnAmt:    { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  returnNote:   { fontSize: 11, color: '#6b7280', flex: 1 },
  addReturnBtn: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  addReturnText:{ fontSize: 12, color: '#16a34a', fontWeight: '600' },
});

