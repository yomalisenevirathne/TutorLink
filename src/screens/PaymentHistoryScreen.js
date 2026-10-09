import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, Modal, Pressable, SectionList, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatPaymentAmount, formatPaymentDate, getPaymentSections } from '../data/paymentHistory';
import { getCombinedPaymentHistory, paymentHistoryErrorMessage } from '../services/payments';
import PaymentSettingsDrawer from '../components/PaymentSettingsDrawer';

const paymentColors = {
  Paid: { text: '#168653', border: '#E0EEE7', background: '#EDF8F1' },
  Refunded: { text: '#D64559', border: '#F5E0E5', background: '#FFF1F4' },
  Pending: { text: '#B9690B', border: '#F3E8D7', background: '#FFF7E9' },
  Demo: { text: '#168653', border: '#E0EEE7', background: '#EDF8F1' },
};
const statuses = ['All', 'Paid', 'Pending', 'Refunded'];
const statusColors = {
  Paid: { text: '#00A83C', background: '#EFFBF3' },
  Pending: { text: '#E56A00', background: '#FFF6ED' },
  Refunded: { text: '#FF2929', background: '#FFF1F1' },
  Demo: { text: '#7100FF', background: '#F6F0FF' },
};

function PaymentCard({ payment }) {
  const [failedImageUrl, setFailedImageUrl] = useState(null);
  const { width } = useWindowDimensions();
  const compact = width < 360;
  const colors = paymentColors[payment.status];
  const nameParts = payment.name.trim().split(/\s+/);
  const displayName = nameParts.length > 1 ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}` : nameParts[0];
  const initials = nameParts.slice(0, 2).map((part) => part[0]).join('');
  return (
    <View style={[styles.card, { borderColor: colors.border }, compact && styles.compactCard]}
      accessibilityLabel={`${payment.name}, ${formatPaymentAmount(payment)}, ${payment.status}, ${formatPaymentDate(payment.occurredAt)}${payment.reference ? `, ${payment.reference}` : ''}`}>
      <View style={[styles.avatar, { backgroundColor: colors.background, borderColor: colors.border }, compact && styles.compactAvatar]}>
        {payment.avatarUrl && payment.avatarUrl !== failedImageUrl ? (
          <Image source={{ uri: payment.avatarUrl }} style={styles.avatarImage} resizeMode="cover"
            accessibilityLabel={`${payment.name} profile photo`} onError={() => setFailedImageUrl(payment.avatarUrl)} />
        ) : (
          <Text style={[styles.initials, { color: colors.text }]}>{initials}</Text>
        )}
      </View>
      <View style={styles.cardDetails}>
        <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
        <Text style={[styles.date, compact && styles.compactDate]}>{formatPaymentDate(payment.occurredAt)}</Text>
        {payment.status === 'Demo' && (
          <View style={styles.demoBadge}>
            <View style={styles.demoDot} />
            <Text style={styles.demoLabel}>Demo · No money charged</Text>
          </View>
        )}
      </View>
      <Text style={[styles.amount, { color: colors.text }, compact && styles.compactAmount]}
        numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{formatPaymentAmount(payment)}</Text>
    </View>
  );
}

export default function PaymentHistoryScreen({ onBackToAccount, userId, isDemo = false, cardsVersion = 0, onManagePayments, onAddCard, onStarPress }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const request = useRef({ id: 0, controller: null });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [filterVisible, setFilterVisible] = useState(false);
  const [draftStatus, setDraftStatus] = useState('All');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const sections = useMemo(() => getPaymentSections(payments, search, status), [payments, search, status]);
  const hasFilters = status !== 'All';
  const isHistoryEmpty = !loading && !refreshing && !loadError && payments.length === 0 && !hasFilters && !search;

  const fetchPayments = useCallback(() => {
    request.current.controller?.abort();
    const controller = new AbortController();
    const id = request.current.id + 1;
    request.current = { id, controller };
    return getCombinedPaymentHistory(userId, { signal: controller.signal, isDemo }).then((records) => {
      if (!controller.signal.aborted && request.current.id === id) { setPayments(records); setLoadError(''); }
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
  }, [userId, isDemo]);

  const loadPayments = (refresh = false) => {
    setLoading(!refresh);
    setRefreshing(refresh);
    setLoadError('');
    if (!refresh) setPayments([]);
    return fetchPayments();
  };

  useFocusEffect(useCallback(() => {
    fetchPayments();
    return () => request.current.controller?.abort();
  }, [fetchPayments]));

  useFocusEffect(useCallback(() => () => {
    setSettingsVisible(false);
    setFilterVisible(false);
  }, []));

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBackToAccount();
      return true;
    });
    return () => subscription.remove();
  }, [onBackToAccount]));

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
        <TouchableOpacity style={styles.backButton} onPress={onBackToAccount} accessibilityRole="button" accessibilityLabel="Back to account">
          <Feather name="arrow-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Payment History</Text>
        <TouchableOpacity style={styles.headerActionButton} onPress={onStarPress}
          accessibilityRole="button" accessibilityLabel="View all tutors">
          <Feather name="star" size={21} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerActionButton} onPress={() => { setFilterVisible(false); setSettingsVisible(true); }}
          accessibilityRole="button" accessibilityLabel="Payment settings" accessibilityState={{ expanded: settingsVisible }}>
          <Feather name="settings" size={21} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {!isHistoryEmpty && (
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={20} color="#8C79A5" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search"
            placeholderTextColor="#968BA4"
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
          <Feather name="filter" size={22} color="#FFFFFF" />
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
              <Feather name={loadError ? 'alert-circle' : isHistoryEmpty ? 'file-text' : 'search'} size={34} color="#875CC4" />
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

      {settingsVisible && <PaymentSettingsDrawer userId={userId} isDemo={isDemo} cardsVersion={cardsVersion}
        onClose={() => setSettingsVisible(false)}
        onManagePayments={() => { setSettingsVisible(false); onManagePayments(); }}
        onAddCard={() => { setSettingsVisible(false); onAddCard(); }} />}

      <Modal visible={filterVisible} transparent animationType="fade" onRequestClose={() => setFilterVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFilterVisible(false)} accessibilityRole="button" accessibilityLabel="Close payment filters" />
          <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.filterPanel} accessibilityViewIsModal>
            <View style={styles.sheetHandle} />
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle} accessibilityRole="header">Filter by Status</Text>
              <TouchableOpacity style={styles.filterCloseButton} onPress={() => setFilterVisible(false)} accessibilityRole="button" accessibilityLabel="Close payment filters">
                <Feather name="x" size={20} color="#746580" />
              </TouchableOpacity>
            </View>
            <View accessibilityRole="radiogroup">
              {statuses.map((option) => (
                <TouchableOpacity key={option} style={[styles.statusOption, draftStatus === option && styles.selectedOption]} onPress={() => setDraftStatus(option)} accessibilityRole="radio" accessibilityLabel={option} accessibilityState={{ checked: draftStatus === option }}>
                  <Text style={[styles.optionText, draftStatus === option && styles.selectedOptionText]}>{option}</Text>
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
  screen: { flex: 1, backgroundColor: '#FAF8FD' },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  header: { minHeight: 76, backgroundColor: '#7100FF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, boxShadow: '0px 6px 16px rgba(89, 27, 166, 0.14)' },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#FFFFFF', fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  headerActionButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255, 255, 255, 0.13)', alignItems: 'center', justifyContent: 'center' },
  searchRow: { width: '100%', maxWidth: 720, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, marginTop: 24, marginBottom: 6 },
  searchBox: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderWidth: 1, borderColor: '#E8DFF2', backgroundColor: '#FFFFFF', borderRadius: 15, gap: 10, boxShadow: '0px 2px 6px rgba(49, 25, 76, 0.025)' },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 12, fontSize: 14, color: '#2D203D' },
  filterButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7100FF', borderRadius: 15, boxShadow: '0px 4px 10px rgba(113, 0, 255, 0.18)' },
  filterDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFD44D', borderWidth: 1.5, borderColor: '#7100FF' },
  filterChip: { alignSelf: 'flex-start', marginLeft: 20, marginTop: 12, marginBottom: 2, minHeight: 36, paddingHorizontal: 12, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterChipText: { fontSize: 13, fontWeight: '500' },
  list: { flex: 1 },
  listContent: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 20 },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 18 },
  monthTitle: { color: '#82748F', fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  monthLine: { flex: 1, height: 1, backgroundColor: '#E9E1EF' },
  card: { minHeight: 108, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 18, marginBottom: 14, width: '100%', boxShadow: '0px 4px 12px rgba(44, 30, 66, 0.045)' },
  compactCard: { gap: 8, paddingHorizontal: 12 },
  avatar: { width: 48, height: 48, borderRadius: 17, flexShrink: 0, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  compactAvatar: { width: 40, height: 40, borderRadius: 14 },
  avatarImage: { width: '100%', height: '100%' },
  initials: { fontSize: 15, fontWeight: '700', letterSpacing: 0.4 },
  cardDetails: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '700', color: '#292034', marginBottom: 5, letterSpacing: -0.3 },
  date: { fontSize: 11, lineHeight: 16, color: '#85788F' },
  compactDate: { fontSize: 10 },
  demoBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7, maxWidth: '100%' },
  demoDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#9369CA', flexShrink: 0 },
  demoLabel: { flexShrink: 1, fontSize: 10, lineHeight: 14, color: '#8657BD', fontWeight: '500' },
  amount: { fontSize: 14, flexShrink: 0, fontWeight: '700', textAlign: 'right', maxWidth: '36%', fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  compactAmount: { fontSize: 12 },
  sectionFooter: { height: 6 },
  emptyList: { flexGrow: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  emptyIconCircle: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEE6F8', marginBottom: 8 },
  emptyTitle: { fontSize: 21, fontWeight: '700', color: '#292034', textAlign: 'center' },
  emptyText: { fontSize: 13, lineHeight: 21, color: '#85788F', textAlign: 'center' },
  findTutorButton: { marginHorizontal: 20, marginBottom: 24, minHeight: 50, borderRadius: 16, backgroundColor: '#7100FF', alignItems: 'center', justifyContent: 'center' },
  resetButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  resetText: { color: '#7100FF', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(30, 15, 49, 0.4)', justifyContent: 'flex-end', alignItems: 'center' },
  filterPanel: { width: '100%', maxWidth: 560, backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2D9EC', alignSelf: 'center', marginBottom: 16 },
  filterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  filterTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#292034' },
  filterCloseButton: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F1FA' },
  statusOption: { minHeight: 52, paddingHorizontal: 16, marginBottom: 8, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#EEE8F3' },
  selectedOption: { backgroundColor: '#F6F0FF', borderColor: '#D5B9FA' },
  optionText: { fontSize: 14, color: '#645570', fontWeight: '600' },
  selectedOptionText: { color: '#7100FF' },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#D5CBDD', alignItems: 'center', justifyContent: 'center' },
  selectedRadio: { borderColor: '#7100FF' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#7100FF' },
  filterActions: { marginTop: 16 },
  applyButton: { width: '100%', minHeight: 50, backgroundColor: '#7100FF', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  applyText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
