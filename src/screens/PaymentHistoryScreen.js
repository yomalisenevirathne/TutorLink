import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, Modal, Pressable, SectionList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatPaymentAmount, formatPaymentDate, getPaymentSections } from '../data/paymentHistory';
import { getPaymentHistory, paymentHistoryErrorMessage } from '../services/payments';

const paymentColors = {
  Sent: { text: '#FF2929', border: '#FFE2E2' },
  Received: { text: '#00C83C', border: '#DDF9E7' },
  Pending: { text: '#FF7000', border: '#FFE5D4' },
};
const statuses = ['All', 'Paid', 'Pending', 'Refunded'];
const statusColors = {
  Paid: { text: '#00A83C', background: '#EFFBF3' },
  Pending: { text: '#E56A00', background: '#FFF6ED' },
  Refunded: { text: '#FF2929', background: '#FFF1F1' },
};

function PaymentCard({ payment }) {
  const [imageFailed, setImageFailed] = useState(false);
  const colors = paymentColors[payment.status === 'Pending' ? 'Pending' : payment.status === 'Refunded' ? 'Sent' : payment.direction];
  const initials = payment.name.split(' ').slice(0, 2).map((part) => part[0]).join('');
  return (
    <View style={[styles.card, { borderColor: colors.border }]} accessibilityLabel={`${payment.name}, ${formatPaymentAmount(payment)}, ${payment.status}, ${payment.direction}, ${formatPaymentDate(payment.occurredAt)}`}>
      <View style={[styles.avatar, { borderColor: colors.border }]}>
        {payment.avatarUrl && !imageFailed ? (
          <Image source={{ uri: payment.avatarUrl }} style={styles.avatarImage} onError={() => setImageFailed(true)} />
        ) : (
          <Text style={styles.initials}>{initials}</Text>
        )}
      </View>
      <View style={styles.cardDetails}>
        <Text style={styles.name} numberOfLines={1}>{payment.name}</Text>
        <Text style={styles.date}>{formatPaymentDate(payment.occurredAt)}</Text>
      </View>
      <Text style={[styles.amount, { color: colors.text }]}>{formatPaymentAmount(payment)}</Text>
    </View>
  );
}

export default function PaymentHistoryScreen({ onBackToAccount, userId }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const request = useRef({ id: 0, controller: null });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [filterVisible, setFilterVisible] = useState(false);
  const [draftStatus, setDraftStatus] = useState('All');
  const sections = useMemo(() => getPaymentSections(payments, search, status), [payments, search, status]);
  const hasFilters = status !== 'All';
  const isHistoryEmpty = !loading && !refreshing && !loadError && payments.length === 0 && !hasFilters && !search;

  const fetchPayments = useCallback(() => {
    request.current.controller?.abort();
    const controller = new AbortController();
    const id = request.current.id + 1;
    request.current = { id, controller };
    return getPaymentHistory(userId, { signal: controller.signal }).then((records) => {
      if (!controller.signal.aborted && request.current.id === id) setPayments(records);
    }).catch((error) => {
      if (!controller.signal.aborted && request.current.id === id) {
        setPayments([]);
        setLoadError(paymentHistoryErrorMessage(error));
        console.warn('[Payment History]', error.code || error.name, error.message);
      }
    }).finally(() => {
      if (!controller.signal.aborted && request.current.id === id) {
        setLoading(false);
        setRefreshing(false);
      }
    });
  }, [userId]);

  const loadPayments = (refresh = false) => {
    setLoading(!refresh);
    setRefreshing(refresh);
    setLoadError('');
    if (!refresh) setPayments([]);
    return fetchPayments();
  };

  useEffect(() => {
    fetchPayments();
    return () => request.current.controller?.abort();
  }, [fetchPayments]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBackToAccount();
      return true;
    });
    return () => subscription.remove();
  }, [onBackToAccount]);

  const openFilters = () => {
    setDraftStatus(status);
    setFilterVisible(true);
  };

  const resetFilters = () => {
    setSearch('');
    setStatus('All');
    setFilterVisible(false);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBackToAccount} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back to account">
          <Feather name="arrow-left" size={23} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">Payment History</Text>
      </View>

      {!isHistoryEmpty && (
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={22} color="#222222" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search"
            placeholderTextColor="#999999"
            accessibilityLabel="Search payment history"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8}>
              <Feather name="x" size={17} color="#777777" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={openFilters} hitSlop={4} accessibilityRole="button" accessibilityLabel={hasFilters ? 'Edit active payment filters' : 'Filter payments'}>
          <Feather name="filter" size={29} color="#FFFFFF" />
          {hasFilters && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>
      )}

      {hasFilters && (
        <TouchableOpacity
          style={[styles.filterChip, { backgroundColor: statusColors[status].background }]}
          onPress={() => setStatus('All')}
          accessibilityRole="button"
          accessibilityLabel={`Clear ${status} filter`}
        >
          <Text style={[styles.filterChipText, { color: statusColors[status].text }]}>{status}</Text>
          <Feather name="x" size={15} color={statusColors[status].text} />
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.loadingState} accessibilityRole="progressbar" accessibilityLabel="Loading payment history">
          <ActivityIndicator size="large" color="#7100FF" />
          <Text style={styles.emptyText}>Loading payment history…</Text>
        </View>
      ) : (
      <SectionList
        style={styles.list}
        contentContainerStyle={[styles.listContent, sections.length === 0 && styles.emptyList]}
        sections={sections}
        keyExtractor={(payment) => payment.id}
        renderItem={({ item }) => <PaymentCard payment={item} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.monthRow}>
            <Text style={styles.monthTitle}>{section.title}</Text>
            <View style={styles.monthLine} />
          </View>
        )}
        renderSectionFooter={() => <View style={styles.sectionFooter} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              {loadError ? <Feather name="alert-circle" size={42} color="#A3A3A3" /> : (
                <Text style={styles.emptyIcon} numberOfLines={1}>{isHistoryEmpty ? '📄🔍' : '🔎'}</Text>
              )}
            </View>
            <Text style={styles.emptyTitle}>{loadError ? 'Unable to load payments' : hasFilters ? `No ${status.toLowerCase()} payments` : search ? 'No matching payments' : 'No payments yet'}</Text>
            <Text style={styles.emptyText}>{loadError || (isHistoryEmpty ? 'Your transaction history will show up here\nonce you book your first session' : "You don't have any transactions\nmatching this filter right now")}</Text>
            {loadError ? (
              <TouchableOpacity onPress={() => loadPayments()} style={styles.resetButton} accessibilityRole="button" accessibilityLabel="Retry loading payment history">
                <Text style={styles.resetText}>Try again</Text>
              </TouchableOpacity>
            ) : (!!search || hasFilters) && (
              <TouchableOpacity onPress={resetFilters} style={styles.resetButton} accessibilityRole="button">
                <Text style={styles.resetText}>Clear search and filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={8}
        onRefresh={() => loadPayments(true)}
        refreshing={refreshing}
      />
      )}

      {isHistoryEmpty && (
        <TouchableOpacity style={styles.findTutorButton} onPress={onBackToAccount} accessibilityRole="button">
          <Text style={styles.applyText}>Find a Tutor</Text>
        </TouchableOpacity>
      )}

      <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea}>
        <View style={styles.bottomTabBar}>
          <TouchableOpacity style={styles.tabItem} onPress={onBackToAccount} accessibilityRole="button" accessibilityLabel="Home">
            <Text style={styles.tabIcon}>🏠</Text>
            <Text style={styles.tabLabel}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tabItem} disabled accessibilityRole="button" accessibilityLabel="Bookings" accessibilityState={{ disabled: true }}>
            <Text style={styles.tabIcon}>📅</Text>
            <Text style={styles.tabLabel}>Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tabItem} disabled accessibilityRole="button" accessibilityLabel="Messages" accessibilityState={{ disabled: true }}>
            <Text style={styles.tabIcon}>💬</Text>
            <Text style={styles.tabLabel}>Messages</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tabItem} accessibilityRole="tab" accessibilityLabel="Payments" accessibilityState={{ selected: true }}>
            <Text style={styles.tabIcon}>💳</Text>
            <Text style={[styles.tabLabel, styles.tabLabelActive]}>Payments</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tabItem} onPress={onBackToAccount} accessibilityRole="button" accessibilityLabel="Account">
            <Text style={styles.tabIcon}>👤</Text>
            <Text style={styles.tabLabel}>Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <Modal visible={filterVisible} transparent animationType="fade" onRequestClose={() => setFilterVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFilterVisible(false)} accessibilityRole="button" accessibilityLabel="Close payment filters" />
          <SafeAreaView edges={['bottom']} style={styles.filterPanel} accessibilityViewIsModal>
            <Text style={styles.filterTitle} accessibilityRole="header">Filter by Status</Text>
            <View accessibilityRole="radiogroup">
              {statuses.map((option) => (
                <TouchableOpacity key={option} style={styles.statusOption} onPress={() => setDraftStatus(option)} accessibilityRole="radio" accessibilityLabel={option} accessibilityState={{ checked: draftStatus === option }}>
                  <Text style={styles.optionText}>{option}</Text>
                  <View style={[styles.radioCircle, draftStatus === option && styles.selectedRadio]}>
                    {draftStatus === option && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.applyButton} onPress={() => { setStatus(draftStatus); setFilterVisible(false); }} accessibilityRole="button">
                <Text style={styles.applyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  bottomSafeArea: { backgroundColor: '#FFFFFF' },
  bottomTabBar: { height: 65, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  tabItem: { alignItems: 'center', justifyContent: 'center' },
  tabIcon: { fontSize: 18, marginBottom: 2 },
  tabLabel: { fontSize: 10, color: '#64748B', fontWeight: '500' },
  tabLabelActive: { color: '#7C3AED', fontWeight: '700' },
  header: { minHeight: 70, backgroundColor: '#7100FF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12 },
  title: { color: '#FFFFFF', fontSize: 23, fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 26, marginTop: 18, marginBottom: 4 },
  searchBox: { flex: 1, minHeight: 38, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, borderWidth: 1, borderColor: '#9454D3', borderRadius: 3, gap: 10 },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 6, fontSize: 14, color: '#222222' },
  filterButton: { width: 56, minHeight: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: '#530096', borderRadius: 3 },
  filterDot: { position: 'absolute', top: 5, right: 6, width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFD44D' },
  filterChip: { alignSelf: 'flex-start', marginLeft: 26, marginTop: 16, marginBottom: 2, minHeight: 30, paddingHorizontal: 8, borderRadius: 3, flexDirection: 'row', alignItems: 'center', gap: 7 },
  filterChipText: { fontSize: 13, fontWeight: '500' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 26, paddingBottom: 12 },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12, marginBottom: 22 },
  monthTitle: { color: '#A3A3A3', fontSize: 13, fontWeight: '600' },
  monthLine: { flex: 1, height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#A3A3A3' },
  card: { minHeight: 65, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderRadius: 5, paddingHorizontal: 9, paddingVertical: 9, marginBottom: 16, boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.04)' },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, overflow: 'hidden', backgroundColor: '#F3F0FA', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  initials: { fontSize: 15, color: '#530096', fontWeight: '600' },
  cardDetails: { flex: 1, minWidth: 0, marginLeft: 18, marginRight: 6 },
  name: { fontSize: 14, fontWeight: '700', color: '#080808', marginBottom: 5 },
  date: { fontSize: 9, fontWeight: '600', color: '#111111' },
  amount: { fontSize: 12, fontWeight: '500', fontVariant: ['tabular-nums'] },
  sectionFooter: { height: 0 },
  emptyList: { flexGrow: 1 },
  emptyState: { flex: 1, alignItems: 'center', paddingTop: 104, paddingBottom: 24, gap: 9 },
  emptyIconCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F7' },
  emptyIcon: { fontSize: 34 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#111111', textAlign: 'center' },
  emptyText: { fontSize: 14, fontWeight: '500', color: '#A3A3A3', textAlign: 'center' },
  findTutorButton: { marginHorizontal: 30, marginBottom: 26, minHeight: 44, borderRadius: 3, backgroundColor: '#530096', alignItems: 'center', justifyContent: 'center' },
  resetButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  resetText: { color: '#7100FF', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  filterPanel: { width: '100%', backgroundColor: '#FFFFFF', paddingHorizontal: 46, paddingTop: 36, paddingBottom: 30 },
  filterTitle: { fontSize: 18, fontWeight: '700', color: '#111111', marginBottom: 6 },
  statusOption: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#DADADA' },
  optionText: { fontSize: 14, color: '#111111', fontWeight: '600' },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#D8D8D8', alignItems: 'center', justifyContent: 'center' },
  selectedRadio: { borderColor: '#111111' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#111111' },
  filterActions: { alignItems: 'center', marginTop: 36 },
  applyButton: { width: 180, minHeight: 44, backgroundColor: '#530096', borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  applyText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
