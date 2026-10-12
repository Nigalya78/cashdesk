import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useAuth } from '../store/authStore';
import { openShift, getMyShifts } from '../services/cashierApi';
import { getApiErrorMessage } from '../services/api';
import { getGreeting, formatDate, formatRupees, toNum } from '../utils/format';
import { Shift } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'StartShift'>;

export default function StartShiftScreen({ navigation }: Props) {
  const { user, refreshShift, logout } = useAuth();

  const [starting,       setStarting]       = useState(false);
  const [prevShift,      setPrevShift]      = useState<Shift | null>(null);
  const [prevLoading,    setPrevLoading]    = useState(true);

  // Load previous completed shift on mount
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
      // AppNavigator will auto-navigate to Shift when activeShift becomes non-null
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err);
      if (msg.toLowerCase().includes('already have an active shift')) {
        // Resume existing shift
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
  const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Greeting ─────────────────────────────────────────────── */}
        <View style={s.greetingSection}>
          <Text style={s.greeting}>{getGreeting(user?.name ?? '')}</Text>
          <Text style={s.date}>{dateStr}</Text>
        </View>

        {/* ── Start Shift ──────────────────────────────────────────── */}
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

        {/* ── My Data ──────────────────────────────────────────────── */}
        <TouchableOpacity
          style={s.myDataBtn}
          onPress={() => navigation.navigate('MyData')}
          activeOpacity={0.85}
        >
          <Ionicons name="person-outline" size={18} color="#374151" style={{ marginRight: 8 }} />
          <Text style={s.myDataBtnText}>My Data</Text>
        </TouchableOpacity>

        {/* ── Previous Shift ───────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Previous Shift</Text>

          {prevLoading ? (
            <View style={s.prevCard}>
              <ActivityIndicator size="small" color="#2563eb" />
            </View>
          ) : prevShift ? (
            <View style={s.prevCard}>
              <Text style={s.prevDate}>{formatDate(prevShift.shift_date)}</Text>
              <View style={s.divider} />
              <PrevRow label="Cash Balance" value={formatRupees(toNum(prevShift.cash_balance))} color="#1d4ed8" bold />
              <PrevRow label="Entries"      value={String(prevShift.entry_count ?? 0)}          color="#374151" />
              <PrevRow label="Cash Outs"    value={String(prevShift.cash_out_count ?? 0)}        color="#374151" />
            </View>
          ) : (
            <View style={s.prevCard}>
              <Text style={s.noShiftText}>No previous shifts</Text>
            </View>
          )}
        </View>

        {/* ── Logout ───────────────────────────────────────────────── */}
        <TouchableOpacity
          style={s.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={s.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function PrevRow({ label, value, color, bold = false }: {
  label: string; value: string; color: string; bold?: boolean;
}) {
  return (
    <View style={pr.row}>
      <Text style={pr.label}>{label}</Text>
      <Text style={[pr.value, { color }, bold && pr.bold]}>{value}</Text>
    </View>
  );
}
const pr = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  label: { fontSize: 13, color: '#6b7280' },
  value: { fontSize: 13, fontWeight: '600' },
  bold:  { fontSize: 15, fontWeight: '800' },
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
  prevDate:    { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 8 },
  divider:     { height: 1, backgroundColor: '#f3f4f6', marginVertical: 8 },
  noShiftText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 8 },

  logoutBtn:     { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20 },
  logoutBtnText: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
});
