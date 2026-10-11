import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { getMyShifts, getShiftEntries, getShiftCashOuts } from '../services/cashierApi';
import { getApiErrorMessage } from '../services/api';
import { formatRupees, formatDate, formatTime, toNum } from '../utils/format';
import { Shift, Entry, CashOut } from '../types';

interface ShiftDetail { entries: Entry[]; cashOuts: CashOut[]; }

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function today(): Date { return new Date(); }

export default function MyDataScreen() {
  const [fromDate,   setFromDate]   = useState<Date>(today());
  const [toDate,     setToDate]     = useState<Date>(today());
  const [showFrom,   setShowFrom]   = useState(false);
  const [showTo,     setShowTo]     = useState(false);

  const [shifts,     setShifts]     = useState<Shift[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [hasLoaded,  setHasLoaded]  = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailMap,  setDetailMap]  = useState<Record<string, ShiftDetail>>({});
  const [loadingId,  setLoadingId]  = useState<string | null>(null);

  function onFromChange(_: DateTimePickerEvent, selected?: Date) {
    setShowFrom(false);
    if (selected) setFromDate(selected);
  }

  function onToChange(_: DateTimePickerEvent, selected?: Date) {
    setShowTo(false);
    if (selected) setToDate(selected);
  }

  async function handleView() {
    const from = toDateStr(fromDate);
    const to   = toDateStr(toDate);
    if (from > to) { Alert.alert('Invalid', 'From date must be on or before To date.'); return; }
    setLoading(true);
    try {
      const data = await getMyShifts(from, to);
      setShifts(data); setHasLoaded(true); setExpandedId(null);
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err));
    } finally { setLoading(false); }
  }

  async function toggleShift(shiftId: string) {
    if (expandedId === shiftId) { setExpandedId(null); return; }
    setExpandedId(shiftId);
    if (!detailMap[shiftId]) {
      setLoadingId(shiftId);
      try {
        const [entries, cashOuts] = await Promise.all([
          getShiftEntries(shiftId),
          getShiftCashOuts(shiftId),
        ]);
        setDetailMap((prev) => ({ ...prev, [shiftId]: { entries, cashOuts } }));
      } catch (err) {
        Alert.alert('Error', getApiErrorMessage(err));
      } finally { setLoadingId(null); }
    }
  }

  const totals = shifts.reduce(
    (a, s) => ({
      cash_in:  a.cash_in  + toNum(s.opening_cash_in) + toNum(s.total_entries_cash),
      cash_out: a.cash_out + toNum(s.total_cash_out),
      balance:  a.balance  + toNum(s.cash_balance),
      card:     a.card     + toNum(s.total_card),
    }),
    { cash_in: 0, cash_out: 0, balance: 0, card: 0 }
  );

  return (
    <SafeAreaView style={s.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        {/* Date filter */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Date Range</Text>
          <View style={s.dateRow}>
            {/* From */}
            <View style={s.dateField}>
              <Text style={s.dateLabel}>From</Text>
              <TouchableOpacity style={s.datePicker} onPress={() => setShowFrom(true)} activeOpacity={0.7}>
                <Ionicons name="calendar-outline" size={16} color="#6b7280" style={{ marginRight: 6 }} />
                <Text style={s.dateText} numberOfLines={1}>{toDateStr(fromDate)}</Text>
              </TouchableOpacity>
            </View>
            <View style={s.dateSep} />
            {/* To */}
            <View style={s.dateField}>
              <Text style={s.dateLabel}>To</Text>
              <TouchableOpacity style={s.datePicker} onPress={() => setShowTo(true)} activeOpacity={0.7}>
                <Ionicons name="calendar-outline" size={16} color="#6b7280" style={{ marginRight: 6 }} />
                <Text style={s.dateText} numberOfLines={1}>{toDateStr(toDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={[s.viewBtn, loading && s.btnOff]} onPress={handleView} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.viewBtnText}>View</Text>}
          </TouchableOpacity>
        </View>

        {/* Native date pickers — shown as modal on Android */}
        {showFrom && (
          <DateTimePicker
            value={fromDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            maximumDate={today()}
            onChange={onFromChange}
          />
        )}
        {showTo && (
          <DateTimePicker
            value={toDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={fromDate}
            maximumDate={today()}
            onChange={onToChange}
          />
        )}

        {/* Range totals */}
        {hasLoaded && shifts.length > 0 && (
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>{formatDate(toDateStr(fromDate))} – {formatDate(toDateStr(toDate))}</Text>
            <View style={s.summaryGrid}>
              <SummaryItem label="Cash In"  value={formatRupees(totals.cash_in)}  />
              <SummaryItem label="Cash Out" value={formatRupees(totals.cash_out)} />
              <SummaryItem label="Balance"  value={formatRupees(totals.balance)}  highlight />
              <SummaryItem label="Card"     value={formatRupees(totals.card)}     />
            </View>
          </View>
        )}

        {/* Empty */}
        {hasLoaded && shifts.length === 0 && (
          <View style={s.emptyCard}>
            <Text style={s.emptyTitle}>No shifts in this range</Text>
            <Text style={s.emptySub}>Try a different date range.</Text>
          </View>
        )}

        {/* Shift cards */}
        {shifts.map((shift) => {
          const isOpen      = expandedId === shift.id;
          const detail      = detailMap[shift.id];
          const isFetching  = loadingId === shift.id;
          const totalCashIn = toNum(shift.opening_cash_in) + toNum(shift.total_entries_cash);
          const shiftTitle  = `${formatDate(shift.shift_date)} (${formatTime(shift.login_time)}${shift.end_time ? ` – ${formatTime(shift.end_time)}` : ''})`;

          return (
            <View key={shift.id} style={s.shiftCard}>
              <TouchableOpacity onPress={() => toggleShift(shift.id)} activeOpacity={0.85} style={s.shiftHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.shiftTitle}>{shiftTitle}</Text>
                  <View style={s.shiftStatusRow}>
                    <View style={[s.statusDot, { backgroundColor: shift.status === 'active' ? '#16a34a' : '#9ca3af' }]} />
                    <Text style={s.statusText}>{shift.status === 'active' ? 'Active' : 'Completed'}</Text>
                  </View>
                </View>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" style={{ marginLeft: 8 }} />
              </TouchableOpacity>

              <View style={s.miniTotals}>
                <MiniTot label="In"      value={formatRupees(totalCashIn)}          color="#16a34a" />
                <MiniTot label="Out"     value={formatRupees(shift.total_cash_out)} color="#dc2626" />
                <MiniTot label="Balance" value={formatRupees(shift.cash_balance)}   color="#1d4ed8" />
                <MiniTot label="Card"    value={formatRupees(shift.total_card)}      color="#7c3aed" />
              </View>

              {isOpen && (
                <View style={s.detail}>
                  {isFetching ? (
                    <ActivityIndicator color="#2563eb" style={{ padding: 16 }} />
                  ) : (
                    <>
                      <View style={s.detailSection}>
                        <Text style={s.detailSectionTitle}>Opening Float</Text>
                        <Text style={s.detailValue}>{formatRupees(shift.opening_cash_in)}</Text>
                      </View>

                      {detail && detail.entries.length > 0 && (
                        <View style={s.detailSection}>
                          <Text style={s.detailSectionTitle}>Entries ({detail.entries.length})</Text>
                          {detail.entries.map((entry) => (
                            <View key={entry.id} style={s.detailItem}>
                              <Text style={s.detailItemName}>
                                {entry.entry_name?.trim() ? entry.entry_name : `Entry at ${formatTime(entry.created_at)}`}
                              </Text>
                              {entry.denominations.length > 0 && (
                                <View style={s.chips}>
                                  {entry.denominations.map((d) => (
                                    <View key={d.id} style={s.chip}>
                                      <Text style={s.chipText}>₹{d.denomination}×{d.quantity}</Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                              <View style={s.detailAmts}>
                                <Text style={s.detailAmt}>Cash: <Text style={{ color: '#16a34a', fontWeight: '700' }}>{formatRupees(entry.cash_in)}</Text></Text>
                                <Text style={s.detailAmt}>Card: <Text style={{ color: '#7c3aed', fontWeight: '700' }}>{formatRupees(entry.card_amount)}</Text></Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}

                      {detail && detail.cashOuts.length > 0 && (
                        <View style={s.detailSection}>
                          <Text style={s.detailSectionTitle}>Cash Outs ({detail.cashOuts.length})</Text>
                          {detail.cashOuts.map((co) => (
                            <View key={co.id} style={s.cashOutItem}>
                              <Text style={s.cashOutNote}>{co.note}</Text>
                              <Text style={s.cashOutAmt}>{formatRupees(co.amount)}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {detail && detail.entries.length === 0 && detail.cashOuts.length === 0 && (
                        <Text style={s.noData}>No entries recorded.</Text>
                      )}
                    </>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryItem({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={si.wrap}>
      <Text style={si.label}>{label}</Text>
      <Text style={[si.value, highlight && si.highlight]}>{value}</Text>
    </View>
  );
}
const si = StyleSheet.create({
  wrap:      { width: '48%', marginBottom: 8 },
  label:     { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  value:     { fontSize: 14, fontWeight: '700', color: '#d1d5db' },
  highlight: { fontSize: 18, color: '#fff' },
});

function MiniTot({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={mt.wrap}>
      <Text style={mt.label}>{label}</Text>
      <Text style={[mt.value, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}
const mt = StyleSheet.create({
  wrap:  { flex: 1, alignItems: 'center', minWidth: 0 },
  label: { fontSize: 10, color: '#9ca3af', marginBottom: 2 },
  value: { fontSize: 11, fontWeight: '700' },
});

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#f9fafb' },
  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  card:        { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, marginBottom: 12 },
  cardTitle:   { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 12 },
  dateRow:     { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14 },
  dateField:   { flex: 1 },
  dateSep:     { width: 12 },
  dateLabel:   { fontSize: 11, fontWeight: '600', color: '#6b7280', marginBottom: 6 },
  datePicker:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 12, backgroundColor: '#f9fafb', minHeight: 48 },
  dateText:    { fontSize: 14, color: '#111827', fontWeight: '500', flexShrink: 1 },

  viewBtn:     { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnOff:      { opacity: 0.55 },
  viewBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  summaryCard:  { backgroundColor: '#1f2937', borderRadius: 16, padding: 16, marginBottom: 12 },
  summaryLabel: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  summaryGrid:  { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  emptyCard:  { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  emptySub:   { fontSize: 12, color: '#9ca3af', marginTop: 4 },

  shiftCard:      { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 10, overflow: 'hidden' },
  shiftHeader:    { flexDirection: 'row', alignItems: 'center', padding: 14 },
  shiftTitle:     { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 4 },
  shiftStatusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot:      { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  statusText:     { fontSize: 11, color: '#6b7280' },

  miniTotals: { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },

  detail:             { padding: 14 },
  detailSection:      { marginBottom: 14 },
  detailSectionTitle: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  detailValue:        { fontSize: 16, fontWeight: '700', color: '#16a34a' },

  detailItem:     { backgroundColor: '#f9fafb', borderRadius: 10, padding: 10, marginBottom: 6 },
  detailItemName: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 4 },
  chips:          { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  chip:           { backgroundColor: '#eff6ff', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginRight: 4, marginBottom: 4 },
  chipText:       { fontSize: 10, color: '#1d4ed8', fontWeight: '600' },
  detailAmts:     { flexDirection: 'row' },
  detailAmt:      { fontSize: 12, color: '#6b7280', marginRight: 16 },

  cashOutItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff5f5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 4 },
  cashOutNote: { fontSize: 12, color: '#374151', flex: 1 },
  cashOutAmt:  { fontSize: 13, fontWeight: '700', color: '#dc2626', marginLeft: 8 },

  noData: { fontSize: 12, color: '#9ca3af', textAlign: 'center', paddingVertical: 12 },
});
