import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useAuth } from '../store/authStore';
import { endShift } from '../services/cashierApi';
import { getApiErrorMessage } from '../services/api';
import { formatRupees, formatDate, formatTime, toNum } from '../utils/format';
import { Shift } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'EndShift'>;
type Step  = 'confirm' | 'ending' | 'done';

export default function EndShiftScreen({ navigation }: Props) {
  const { activeShift, setActiveShift } = useAuth();
  const [step,      setStep]      = useState<Step>('confirm');
  const [completed, setCompleted] = useState<Shift | null>(null);

  async function handleEnd() {
    if (!activeShift) return;
    setStep('ending');
    try {
      const done = await endShift(activeShift.id);
      setCompleted(done);
      setStep('done');
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err));
      setStep('confirm');
    }
  }

  async function handleFinish() {
    setActiveShift(null);
  }

  // ── Ending ────────────────────────────────────────────────────────────────
  if (step === 'ending') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={s.endingText}>Ending shift…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (step === 'done' && completed) {
    return (
      <SafeAreaView style={s.safe} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.successHero}>
            <View style={s.checkCircle}>
              <Ionicons name="checkmark" size={32} color="#16a34a" />
            </View>
            <Text style={s.successTitle}>Shift Ended</Text>
            <Text style={s.successSub}>
              {formatDate(completed.shift_date)} · {formatTime(completed.login_time)}
              {completed.end_time ? ` – ${formatTime(completed.end_time)}` : ''}
            </Text>
          </View>

          <View style={s.summaryCard}>
            <Text style={s.summaryTitle}>Final Summary</Text>
            <SummaryRow label="Opening Float" value={formatRupees(toNum(completed.opening_cash_in))}    color="#16a34a" />
            <SummaryRow label="Entries Cash"  value={formatRupees(toNum(completed.total_entries_cash))} color="#16a34a" />
            <SummaryRow label="Card"          value={formatRupees(toNum(completed.total_card))}          color="#7c3aed" />
            <SummaryRow label="Cash Out"      value={formatRupees(toNum(completed.total_cash_out))}      color="#dc2626" />
            <View style={s.divider} />
            <SummaryRow label="Cash Balance"  value={formatRupees(toNum(completed.cash_balance))}        color="#1d4ed8" bold />
            <View style={s.divider} />
            <View style={s.countRow}>
              <Text style={s.countLabel}>Entries</Text>
              <Text style={s.countValue}>{completed.entry_count}</Text>
            </View>
            <View style={s.countRow}>
              <Text style={s.countLabel}>Cash Outs</Text>
              <Text style={s.countValue}>{completed.cash_out_count}</Text>
            </View>
          </View>

          <TouchableOpacity style={s.doneBtn} onPress={handleFinish} activeOpacity={0.85}>
            <Text style={s.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── No active shift ───────────────────────────────────────────────────────
  if (!activeShift) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.noShift}>No active shift found.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Confirm ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        <View style={s.summaryCard}>
          <View style={s.summaryHeaderRow}>
            <Text style={s.summaryTitle}>Shift Summary</Text>
            <View style={s.activePill}>
              <View style={s.activeDot} />
              <Text style={s.activePillText}>Active</Text>
            </View>
          </View>
          <Text style={s.summaryStartTime}>
            Started {formatDate(activeShift.shift_date)} · {formatTime(activeShift.login_time)}
          </Text>
          <View style={s.divider} />
          <SummaryRow label="Opening Float" value={formatRupees(toNum(activeShift.opening_cash_in))}    color="#16a34a" />
          <SummaryRow label="Entries Cash"  value={formatRupees(toNum(activeShift.total_entries_cash))} color="#16a34a" />
          <SummaryRow label="Card"          value={formatRupees(toNum(activeShift.total_card))}          color="#7c3aed" />
          <SummaryRow label="Cash Out"      value={formatRupees(toNum(activeShift.total_cash_out))}      color="#dc2626" />
          <View style={s.divider} />
          <SummaryRow label="Cash Balance"  value={formatRupees(toNum(activeShift.cash_balance))}        color="#1d4ed8" bold />
          <View style={s.divider} />
          <View style={s.countRow}>
            <Text style={s.countLabel}>Entries</Text>
            <Text style={s.countValue}>{activeShift.entry_count}</Text>
          </View>
          <View style={s.countRow}>
            <Text style={s.countLabel}>Cash Outs</Text>
            <Text style={s.countValue}>{activeShift.cash_out_count}</Text>
          </View>
        </View>

        <View style={s.warning}>
          <Ionicons name="warning-outline" size={18} color="#92400e" style={{ marginRight: 8, marginTop: 1 }} />
          <Text style={s.warningText}>
            Ending your shift will <Text style={{ fontWeight: '700' }}>lock all entries</Text>.
            This cannot be undone.
          </Text>
        </View>

        <Text style={s.confirmQuestion}>Are you sure you want to end your shift?</Text>

        <TouchableOpacity style={s.endBtn} onPress={handleEnd} activeOpacity={0.85}>
          <Text style={s.endBtnText}>End Shift</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, color, bold = false }: {
  label: string; value: string; color: string; bold?: boolean;
}) {
  return (
    <View style={sr.row}>
      <Text style={[sr.label, bold && sr.boldLabel]}>{label}</Text>
      <Text style={[sr.value, { color }, bold && sr.boldValue]}>{value}</Text>
    </View>
  );
}
const sr = StyleSheet.create({
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  label:     { fontSize: 13, color: '#6b7280' },
  boldLabel: { fontWeight: '700', color: '#374151' },
  value:     { fontSize: 13, fontWeight: '600' },
  boldValue: { fontSize: 16, fontWeight: '800' },
});

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#f9fafb' },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { padding: 16, paddingBottom: 48 },

  endingText:   { marginTop: 16, fontSize: 14, color: '#6b7280' },

  successHero:  { alignItems: 'center', marginBottom: 24, paddingTop: 8 },
  checkCircle:  { width: 64, height: 64, borderRadius: 32, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  successSub:   { fontSize: 13, color: '#6b7280' },

  summaryCard:      { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, marginBottom: 14, alignSelf: 'stretch' },
  summaryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  summaryTitle:     { fontSize: 15, fontWeight: '700', color: '#111827' },
  summaryStartTime: { fontSize: 12, color: '#9ca3af', marginBottom: 12 },

  activePill:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  activeDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a', marginRight: 4 },
  activePillText: { fontSize: 11, fontWeight: '600', color: '#15803d' },

  divider:    { height: 1, backgroundColor: '#f3f4f6', marginVertical: 8 },
  countRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  countLabel: { fontSize: 12, color: '#9ca3af' },
  countValue: { fontSize: 13, fontWeight: '600', color: '#374151' },

  warning:     { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fcd34d', borderRadius: 12, padding: 12, marginBottom: 16 },
  warningText: { flex: 1, fontSize: 13, color: '#92400e', lineHeight: 19 },

  confirmQuestion: { fontSize: 15, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 20 },

  endBtn:       { backgroundColor: '#dc2626', borderRadius: 14, paddingVertical: 17, alignItems: 'center', marginBottom: 10, minHeight: 52 },
  endBtnText:   { color: '#fff', fontSize: 16, fontWeight: '800' },
  cancelBtn:    { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14, paddingVertical: 15, alignItems: 'center', minHeight: 52 },
  cancelBtnText:{ color: '#374151', fontSize: 15, fontWeight: '600' },

  doneBtn:     { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 17, alignItems: 'center', marginTop: 8 },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  noShift:     { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  backBtn:     { backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  backBtnText: { color: '#2563eb', fontWeight: '600' },
});

