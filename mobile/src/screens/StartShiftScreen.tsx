import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useAuth } from '../store/authStore';
import { openShift, getMyShifts } from '../services/cashierApi';
import { getApiErrorMessage } from '../services/api';
import { getGreeting, formatDate, formatTime, formatRupees, toNum } from '../utils/format';
import { Shift } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'StartShift'>;

export default function StartShiftScreen({ navigation }: Props) {
  const { user, refreshShift, logout } = useAuth();

  const [starting,    setStarting]    = useState(false);
  const [prevShift,   setPrevShift]   = useState<Shift | null>(null);
  const [prevLoading, setPrevLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const shifts = await getMyShifts();
        if (!cancelled) {
          const completed = shifts.find((s) => s.status === 'completed') ?? null;
          setPrevShift(completed);
        }
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setPrevLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleStartShift() {
    setStarting(true);
    try {
      await openShift();
      await refreshShift();
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err);
      if (msg.toLowerCase().includes('already have an active shift')) {
        await refreshShift();
      } else {
        Alert.alert('Error', msg);
        setStarting(false);
      }
    }
  }

  async function handleLogout() {
    await logout();
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* Greeting */}
        <View style={s.greetingSection}>
          <Text style={s.greeting}>{getGreeting(user?.name ?? '')}</Text>
          <Text style={s.date}>{dateStr}</Text>
        </View>

        {/* Start Shift */}
        <TouchableOpacity
          style={[s.startBtn, starting && s.startBtnDisabled]}
          onPress={handleStartShift}
          disabled={starting}
          activeOpacity={0.85}
        >
          {starting
            ? <ActivityIndicator color="#fff" size="small" />
            : (
              <>
                <Ionicons name="play-circle-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
                <Text style={s.startBtnText}>Start Shift</Text>
              </>
            )
          }
        </TouchableOpacity>

        {/* My Data */}
        <TouchableOpacity
          style={s.myDataBtn}
          onPress={() => navigation.navigate('MyData')}
          activeOpacity={0.85}
        >
          <Ionicons name="bar-chart-outline" size={18} color="#374151" style={{ marginRight: 8 }} />
          <Text style={s.myDataBtnText}>My Data</Text>
        </TouchableOpacity>

        {/* Previous Shift */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Previous Shift</Text>

          {prevLoading ? (
            <View style={s.prevCard}>
              <ActivityIndicator size="small" color="#2563eb" />
            </View>
          ) : prevShift ? (
            <View style={s.prevCard}>
              {/* Compact summary */}
              <View style={s.prevRow}>
                <View style={s.prevDateBadge}>
                  <Ionicons name="calendar-outline" size={13} color="#6b7280" style={{ marginRight: 4 }} />
                  <Text style={s.prevDate}>{formatDate(prevShift.shift_date)}</Text>
                </View>
                <View style={[s.statusBadge, prevShift.status === 'active' ? s.statusActive : s.statusDone]}>
                  <Text style={[s.statusText, prevShift.status === 'active' ? s.statusActiveText : s.statusDoneText]}>
                    {prevShift.status === 'active' ? 'Active' : 'Completed'}
                  </Text>
                </View>
              </View>

              <View style={s.prevBalanceRow}>
                <View style={s.prevBalBox}>
                  <Text style={s.prevBalLabel}>Available Balance</Text>
                  <Text style={s.prevBalValue}>{formatRupees(toNum(prevShift.cash_balance))}</Text>
                </View>
                <View style={s.prevBalBox}>
                  <Text style={s.prevBalLabel}>Opening Balance</Text>
                  <Text style={[s.prevBalValue, { color: '#16a34a' }]}>{formatRupees(toNum(prevShift.opening_cash_in))}</Text>
                </View>
              </View>

              {/* View Full Summary */}
              <TouchableOpacity style={s.viewSummaryBtn} onPress={() => setShowSummary(true)} activeOpacity={0.7}>
                <Text style={s.viewSummaryText}>View Full Summary</Text>
                <Ionicons name="chevron-forward" size={14} color="#2563eb" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.prevCard}>
              <Text style={s.noShiftText}>No previous shifts</Text>
            </View>
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={15} color="#9ca3af" style={{ marginRight: 4 }} />
          <Text style={s.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Full Summary Modal */}
      {prevShift && (
        <Modal visible={showSummary} animationType="slide" onRequestClose={() => setShowSummary(false)}>
          <SafeAreaView style={s.safe}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowSummary(false)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
              <Text style={s.modalTitle}>Shift Summary</Text>
              <View style={{ width: 32 }} />
            </View>
            <ScrollView contentContainerStyle={s.modalContent}>
              <Text style={s.modalDate}>
                {formatDate(prevShift.shift_date)} · {formatTime(prevShift.login_time)}
                {prevShift.end_time ? ` – ${formatTime(prevShift.end_time)}` : ''}
              </Text>

              <View style={s.summaryCard}>
                <SummaryRow label="Available Balance"  value={formatRupees(toNum(prevShift.cash_balance))}         color="#1d4ed8" bold />
                <View style={s.divider} />
                <SummaryRow label="Opening Balance"    value={formatRupees(toNum(prevShift.opening_cash_in))}      color="#16a34a" />
                <SummaryRow label="Entries (Cash)"     value={formatRupees(toNum(prevShift.total_entries_cash))}   color="#16a34a" />
                <SummaryRow label="Card"               value={formatRupees(toNum(prevShift.total_card))}           color="#7c3aed" />
                <SummaryRow label="Cash Out"           value={formatRupees(toNum(prevShift.total_cash_out))}       color="#dc2626" />
                <SummaryRow label="Cash In (Returns)"  value={formatRupees(toNum(prevShift.total_cash_in_returns))} color="#16a34a" />
                <View style={s.divider} />
                <SummaryRow label="Entries"   value={String(prevShift.entry_count ?? 0)}     color="#374151" />
                <SummaryRow label="Cash Outs" value={String(prevShift.cash_out_count ?? 0)}  color="#374151" />
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
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
  scroll:  { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },

  greetingSection: { marginBottom: 28, marginTop: 8 },
  greeting:        { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  date:            { fontSize: 13, color: '#9ca3af' },

  startBtn:         { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 12 },
  startBtnDisabled: { opacity: 0.7 },
  startBtnText:     { color: '#fff', fontSize: 17, fontWeight: '800' },

  myDataBtn:     { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 28 },
  myDataBtnText: { color: '#374151', fontSize: 15, fontWeight: '600' },

  section:      { marginBottom: 28 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },

  prevCard:    { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', padding: 16 },
  prevRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  prevDateBadge: { flexDirection: 'row', alignItems: 'center' },
  prevDate:    { fontSize: 13, fontWeight: '600', color: '#374151' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusActive:{ backgroundColor: '#dcfce7' },
  statusDone:  { backgroundColor: '#f3f4f6' },
  statusText:  { fontSize: 11, fontWeight: '600' },
  statusActiveText: { color: '#15803d' },
  statusDoneText:   { color: '#6b7280' },

  prevBalanceRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  prevBalBox:  { flex: 1, backgroundColor: '#f9fafb', borderRadius: 10, padding: 10 },
  prevBalLabel:{ fontSize: 10, color: '#9ca3af', marginBottom: 4 },
  prevBalValue:{ fontSize: 15, fontWeight: '800', color: '#1d4ed8' },

  viewSummaryBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6', marginTop: 4 },
  viewSummaryText: { fontSize: 13, fontWeight: '600', color: '#2563eb', marginRight: 2 },

  noShiftText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 8 },

  logoutBtn:     { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20 },
  logoutBtnText: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },

  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle:   { fontSize: 16, fontWeight: '700', color: '#111827' },
  modalContent: { padding: 16, paddingBottom: 40 },
  modalDate:    { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 16 },

  summaryCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', padding: 16 },
  divider:     { height: 1, backgroundColor: '#f3f4f6', marginVertical: 8 },
});
