import React, { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';
import { checkSlotConflict, saveTutorSessionToDb } from '../bookingService';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const TUTOR_LIST = [
  'Pamoda Dissanayak',
  'Sarith Samarakoon',
  'Tharushi Nethmini',
  'Sathsara Illankoon',
  'Asanka Ekanayaka',
];

export default function ManageSessionScreen({ navigation, currentUser }) {
  const [selectedTutor, setSelectedTutor] = useState(
    currentUser?.fullName || currentUser?.name || currentUser?.email || TUTOR_LIST[0]
  );
  const [isTutorDropdownOpen, setIsTutorDropdownOpen] = useState(false);

  // Course Info State
  const [courseTitle, setCourseTitle] = useState('Data Structures & Algorithms');
  const [courseCode, setCourseCode] = useState('CS204');
  const [courseSubtitle, setCourseSubtitle] = useState('CS204 • Year 2 Semester 1');

  // Course Edit Modal State
  const [isEditCourseModalVisible, setIsEditCourseModalVisible] = useState(false);
  const [editCourseTitle, setEditCourseTitle] = useState('');
  const [editCourseCode, setEditCourseCode] = useState('');
  const [editCourseSubtitle, setEditCourseSubtitle] = useState('');

  const csBadgeText = (courseCode.match(/[a-zA-Z]+/)?.[0] || 'CS').substring(0, 3).toUpperCase();

  // Dynamic Schedule Dates (6-day horizontal strip starting from today)
  const generateUpcomingDays = () => {
    const days = [];
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push({
        day: dayNames[d.getDay()],
        date: d.getDate(),
        fullDate: d,
        month: d.getMonth(),
        year: d.getFullYear(),
      });
    }
    return days;
  };

  const [scheduleDays] = useState(generateUpcomingDays());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  const selectedDayObj = scheduleDays.find((d) => d.date === selectedDay) || scheduleDays[0];
  const displayMonthYear = `${MONTH_NAMES[selectedDayObj.fullDate.getMonth()]} ${selectedDayObj.fullDate.getFullYear()}`;

  // Configured Time Slots
  const [configuredSlots, setConfiguredSlots] = useState([]);

  // Modal to add new slot
  const [isAddSlotModalVisible, setIsAddSlotModalVisible] = useState(false);
  const availableSlotOptions = [
    '8:00 AM - 9:00 AM',
    '9:00 AM - 10:00 AM',
    '1:00 PM - 2:00 PM',
    '2:00 PM - 3:00 PM',
    '4:00 PM - 5:00 PM',
    '6:00 PM - 7:00 PM',
  ];

  // Session Mode & Venue
  const [sessionMode, setSessionMode] = useState('physical');
  const [venueAddress, setVenueAddress] = useState(
    'SLIIT Malabe Campus, Block E - Lab 401'
  );

  // Capacity & Pricing
  const [maxCapacity, setMaxCapacity] = useState(5);
  const [bookedCount, setBookedCount] = useState(0);
  const [loadResult, setLoadResult] = useState(null);
  const [savingSession, setSavingSession] = useState(false);
  const writing = useRef(false);
  const checkingSlot = useRef(false);
  const activeLoadKey = useRef(null);
  const [addingSlot, setAddingSlot] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [slotToRemove, setSlotToRemove] = useState(null);
  const [retry, setRetry] = useState(0);
  const loadKey = `${selectedTutor}:${selectedDayObj.year}:${selectedDayObj.month}:${selectedDay}:${retry}`;
  const loadingSession = loadResult?.key !== loadKey;
  const loadError = loadingSession ? '' : loadResult.error;
  const seatsRemaining = Math.max(0, maxCapacity - bookedCount);
  const [sessionFee, setSessionFee] = useState('700');

  const [isAcceptingBookings, setIsAcceptingBookings] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    activeLoadKey.current = loadKey;
    setFeedback(null);
    setSlotToRemove(null);
    setLoadResult(null);
    setConfiguredSlots([]);
    setBookedCount(0);
    const load = async () => {
      try {
        const [sessionResult, bookingsResult] = await Promise.all([
          supabase.from('tutor_sessions').select('*').eq('tutor_name', selectedTutor)
            .eq('year', selectedDayObj.year).eq('month', selectedDayObj.month + 1).eq('date', selectedDay),
          supabase.from('bookings').select('slot').eq('tutor_name', selectedTutor)
            .eq('year', selectedDayObj.year).eq('month', selectedDayObj.month + 1).eq('date', selectedDay)
            .eq('status', 'Confirmed'),
        ]);
        if (sessionResult.error) throw sessionResult.error;
        if (bookingsResult.error) throw bookingsResult.error;
        if (!active) return;
        const session = sessionResult.data?.[0];
        const bookings = bookingsResult.data || [];
        setCourseTitle(session?.course_title || 'Data Structures & Algorithms');
        setCourseCode(session?.course_code || 'CS204');
        setCourseSubtitle(session?.course_subtitle || 'CS204 - Active Module');
        setSessionMode(session?.mode || 'physical');
        setVenueAddress(session?.venue || 'SLIIT Malabe Campus, Block E - Lab 401');
        setMaxCapacity(session?.max_capacity ?? 5);
        setSessionFee(String(session?.fee ?? 700));
        setIsAcceptingBookings(session?.is_accepting_bookings ?? true);
        setBookedCount(bookings.length);
        const slots = [...new Set((sessionResult.data || [])
          .flatMap((row) => Array.isArray(row.slots) ? row.slots : [])
          .filter((time) => typeof time === 'string' && time.trim())
          .map((time) => time.trim()))];
        setConfiguredSlots(slots.map((time) => ({
          id: `slot-${time}`, time,
          period: time.split(' - ')[0].includes('AM') ? 'Morning' : 'Afternoon / Evening',
          bookingsCount: bookings.filter((booking) => booking.slot?.trim() === time).length,
        })));
        setLoadResult({ key: loadKey, error: '' });
      } catch (error) {
        if (active) setLoadResult({ key: loadKey, error: error.message || 'Unable to load this session. Please try again.' });
      }
    };
    load();
    return () => { active = false; activeLoadKey.current = null; };
  }, [selectedTutor, selectedDay, selectedDayObj.year, selectedDayObj.month, loadKey]));

  const handleOpenCourseModal = () => {
    setFeedback(null);
    setEditCourseTitle(courseTitle);
    setEditCourseCode(courseCode);
    setEditCourseSubtitle(courseSubtitle);
    setIsEditCourseModalVisible(true);
  };

  const handleSaveCourseModal = () => {
    if (!editCourseTitle.trim()) {
      setFeedback({ title: 'Validation Error', message: 'Please enter a course title.' });
      return;
    }
    const cleanCode = editCourseCode.trim() || 'CS204';
    const cleanTitle = editCourseTitle.trim();
    const cleanSubtitle = editCourseSubtitle.trim() || `${cleanCode} • Active Module`;

    setCourseTitle(cleanTitle);
    setCourseCode(cleanCode);
    setCourseSubtitle(cleanSubtitle);
    setFeedback(null);
    setIsEditCourseModalVisible(false);
  };

  const handleSelectNewSlot = async (slotTime) => {
    if (loadingSession || loadError || writing.current || checkingSlot.current) return;
    const alreadyConfigured = configuredSlots.some((s) => s.time === slotTime);
    if (alreadyConfigured) {
      setFeedback({ title: 'Slot Already Added', message: 'This time slot is already configured for this date.' });
      return;
    }

    const requestKey = loadKey;
    checkingSlot.current = true;
    setAddingSlot(true);
    setFeedback(null);
    try {
      const slotStartTime = slotTime.split(' - ')[0];
      const conflictResult = await checkSlotConflict({
        year: selectedDayObj.fullDate.getFullYear(),
        month: selectedDayObj.fullDate.getMonth(),
        date: selectedDay,
        slot: slotStartTime,
        currentTutorName: selectedTutor,
      });
      if (activeLoadKey.current !== requestKey) return;

      if (conflictResult?.hasConflict) {
        setFeedback({
          title: 'Slot Conflict',
          message: conflictResult.message ||
            'Another tutor has already scheduled a session for this time slot. Please choose a different time.'
        });
        return;
      }

      const newSlot = {
        id: `slot-${slotTime}`,
        time: slotTime,
        period: slotTime.includes('AM') ? 'Morning' : 'Afternoon / Evening',
        bookingsCount: 0,
      };

      setConfiguredSlots((prev) => prev.some((slot) => slot.time === slotTime) ? prev : [...prev, newSlot]);
      setIsAddSlotModalVisible(false);
    } catch (error) {
      if (activeLoadKey.current === requestKey) {
        setFeedback({ title: 'Could Not Add Slot', message: error.message || 'Please try again.' });
      }
    } finally {
      checkingSlot.current = false;
      setAddingSlot(false);
    }
  };

  // 💡 DATABASE SYNC: Handle deleting a configured time slot and updating Supabase immediately
  const handleDeleteSlot = (slotId) => {
    if (loadingSession || loadError || writing.current) return;
    if (configuredSlots.find((slot) => slot.id === slotId)?.bookingsCount > 0) {
      setFeedback({ title: 'Slot has bookings', message: 'Cancel or reschedule its bookings before removing this slot.' });
      return;
    }
    setFeedback(null);
    setSlotToRemove(slotId);
  };

  const confirmRemoveSlot = async () => {
    const slotId = slotToRemove;
    if (!slotId || loadingSession || loadError || checkingSlot.current || writing.current) return;
    const updatedSlots = configuredSlots.filter((s) => s.id !== slotId);
    setSlotToRemove(null);
    writing.current = true;
    setSavingSession(true);
    setFeedback(null);
    try {
      const sessionData = {
        tutorName: selectedTutor,
        courseTitle,
        courseCode,
        courseSubtitle,
        selectedDay,
        date: selectedDay,
        month: selectedDayObj.fullDate.getMonth() + 1,
        year: selectedDayObj.fullDate.getFullYear(),
        slots: updatedSlots.map((s) => s.time),
        mode: sessionMode,
        venue: sessionMode === 'physical' ? venueAddress : 'Online Zoom/Meet',
        maxCapacity,
        fee: Number(sessionFee) || 700,
        isAcceptingBookings: updatedSlots.length > 0 ? isAcceptingBookings : false,
      };
      await saveTutorSessionToDb(sessionData);
      setConfiguredSlots(updatedSlots);
      if (!updatedSlots.length) setIsAcceptingBookings(false);
      setFeedback({ title: 'Slot Removed', message: 'Your session has been updated.', success: true });
    } catch (err) {
      console.error('Error updating DB on slot delete:', err);
      setFeedback({ title: 'Update Failed', message: err.message || 'Could not remove this slot. Please try again.' });
    } finally {
      writing.current = false;
      setSavingSession(false);
    }
  };

  const handleDecreaseCapacity = () => {
    if (maxCapacity > Math.max(1, ...configuredSlots.map((slot) => slot.bookingsCount))) setMaxCapacity(maxCapacity - 1);
  };

  const handleIncreaseCapacity = () => {
    if (maxCapacity < 20) setMaxCapacity(maxCapacity + 1);
  };

  const handleSaveSession = async () => {
    if (loadingSession || loadError || writing.current || checkingSlot.current) return;
    if (!Number.isFinite(Number(sessionFee)) || Number(sessionFee) <= 0) {
      setFeedback({ title: 'Invalid Fee', message: 'Enter a session fee greater than zero.' });
      return;
    }
    if (sessionMode === 'physical' && !venueAddress.trim()) {
      setFeedback({ title: 'Venue Required', message: 'Enter the address for your physical session.' });
      return;
    }
    if (configuredSlots.length === 0) {
      setFeedback({ title: 'Slot Required', message: 'Please configure at least one time slot.' });
      return;
    }

    const sessionData = {
      tutorName: selectedTutor,
      courseTitle,
      courseCode,
      courseSubtitle,
      selectedDay,
      date: selectedDay,
      month: selectedDayObj.fullDate.getMonth() + 1,
      year: selectedDayObj.fullDate.getFullYear(),
      slots: configuredSlots.map((s) => s.time),
      mode: sessionMode,
      venue: sessionMode === 'physical' ? venueAddress : 'Online Zoom/Meet',
      maxCapacity,
      fee: Number(sessionFee) || 700,
      isAcceptingBookings,
    };

    writing.current = true;
    setSavingSession(true);
    setFeedback(null);
    try {
      await saveTutorSessionToDb(sessionData);
      setFeedback({ title: 'Session Saved', message: `Your session for ${selectedDay} ${displayMonthYear} has been updated.`, success: true });
    } catch (e) {
      console.error('Save session error:', e);
      setFeedback({ title: 'Save Failed', message: e?.message || 'Could not save your session. Please try again.' });
    } finally {
      writing.current = false;
      setSavingSession(false);
    }
  };

  const feedbackNotice = feedback && (
    <View style={[styles.feedbackNotice, feedback.success && styles.feedbackSuccess]}>
      <Text accessibilityRole="alert" style={styles.feedbackText}>{feedback.title}: {feedback.message}</Text>
    </View>
  );

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#6A1B9A" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => navigation?.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Session</Text>
        <View style={styles.headerRightIcons}>
          <TouchableOpacity style={{ marginRight: 14 }}>
            <Ionicons name="notifications" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation?.navigate('tutorProfile')}>
            <Ionicons name="person-circle" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loadingSession && <Text style={styles.courseSubtitle}>Loading session...</Text>}
        {!!loadError && <View><Text accessibilityRole="alert">{loadError}</Text>
          <TouchableOpacity onPress={() => setRetry((value) => value + 1)}><Text>Retry</Text></TouchableOpacity></View>}

        
        {/* Tutor Selector Dropdown Bar */}
        <View style={styles.tutorSelectorWrapper}>
          <Text style={styles.tutorSelectLabel}>SELECT TUTOR:</Text>
          <TouchableOpacity
            style={styles.tutorDropdownBtn}
            disabled={!!currentUser || loadingSession || savingSession}
            onPress={() => setIsTutorDropdownOpen(!isTutorDropdownOpen)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="person-circle-outline" size={20} color="#6A1B9A" style={{ marginRight: 6 }} />
              <Text style={styles.tutorDropdownBtnText}>{selectedTutor}</Text>
            </View>
            <Ionicons name={isTutorDropdownOpen ? "chevron-up" : "chevron-down"} size={16} color="#6A1B9A" />
          </TouchableOpacity>

          {isTutorDropdownOpen && (
            <View style={styles.tutorDropdownList}>
              {TUTOR_LIST.map((tName) => (
                <TouchableOpacity
                  key={tName}
                  style={[styles.tutorDropdownItem, selectedTutor === tName && styles.tutorDropdownItemActive]}
                  onPress={() => {
                    setSelectedTutor(tName);
                    setIsTutorDropdownOpen(false);
                  }}
                >
                  <Text style={[styles.tutorDropdownItemText, selectedTutor === tName && styles.tutorDropdownItemTextActive]}>
                    {tName}
                  </Text>
                  {selectedTutor === tName && <Ionicons name="checkmark" size={16} color="#6A1B9A" />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Course & Module Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionSmallLabel}>COURSE & MODULE</Text>
          <TouchableOpacity style={styles.changeLinkBtn} onPress={handleOpenCourseModal} activeOpacity={0.7}>
            <Ionicons name="pencil" size={13} color="#6A1B9A" style={{ marginRight: 3 }} />
            <Text style={styles.changeLinkText}>Change</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.courseCard}>
          <View style={styles.csBadge}>
            <Text style={styles.csBadgeText}>{csBadgeText}</Text>
          </View>
          <View style={styles.courseDetails}>
            <Text style={styles.courseTitle}>{courseTitle}</Text>
            <Text style={styles.courseSubtitle}>{courseSubtitle}</Text>
          </View>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        </View>

        {/* Session Schedule (Horizontal Dynamic Date Strip) */}
        <View style={styles.scheduleHeaderRow}>
          <Text style={styles.sectionHeading}>Session Schedule</Text>
          <View style={styles.monthBadge}>
            <Text style={styles.monthBadgeText}>{displayMonthYear}</Text>
          </View>
        </View>

        <View style={styles.dateStripRow}>
          {scheduleDays.map((item) => {
            const isSelected = selectedDay === item.date;
            return (
              <TouchableOpacity
                key={`${item.date}-${item.month}`}
                style={[styles.datePill, isSelected && styles.datePillSelected]}
                disabled={savingSession}
                onPress={() => setSelectedDay(item.date)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayAbbr, isSelected && styles.dayAbbrSelected]}>{item.day}</Text>
                <Text style={[styles.dayNum, isSelected && styles.dayNumSelected]}>{item.date}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Configured Time Slots Section */}
        <View style={styles.slotsHeaderRow}>
          <Text style={styles.slotsHeading}>Configured Time Slots</Text>
          <Text style={styles.slotsCountBadge}>{configuredSlots.length} Active Slots</Text>
        </View>

        {configuredSlots.length > 0 ? (
          configuredSlots.map((slot) => (
            <View key={slot.id} style={styles.slotCard}>
              <View style={styles.slotGreenDot} />
              <View style={styles.slotInfo}>
                <Text style={styles.slotTimeText}>{slot.time}</Text>
                <Text style={styles.slotPeriodText}>{slot.period} • {slot.bookingsCount} Bookings</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteSlot(slot.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={19} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptySlotNotice}>
            <Text style={styles.emptySlotNoticeText}>No time slots configured for this date.</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.addSlotDashedBtn}
          disabled={loadingSession || !!loadError || savingSession || addingSlot}
          onPress={() => { setFeedback(null); setIsAddSlotModalVisible(true); }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={18} color="#4B5563" style={{ marginRight: 4 }} />
          <Text style={styles.addSlotDashedText}>Add New Time Slot</Text>
        </TouchableOpacity>

        {/* Session Mode & Venue */}
        <Text style={[styles.sectionHeading, { marginTop: 26, marginBottom: 12 }]}>Session Mode & Venue</Text>

        <TouchableOpacity
          style={[styles.modeCard, sessionMode === 'online' && styles.modeCardSelected]}
          onPress={() => setSessionMode('online')}
          activeOpacity={0.8}
        >
          <View style={styles.modeCardLeft}>
            <View style={styles.laptopIconBox}><Ionicons name="laptop-outline" size={22} color="#2563EB" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modeTitle}>Online Session</Text>
              <Text style={styles.modeSubtitle}>Automated Zoom or Google Meet link</Text>
            </View>
          </View>
          <View style={[styles.radioCircle, sessionMode === 'online' && styles.radioCircleSelected]}>
            {sessionMode === 'online' && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeCard, sessionMode === 'physical' && styles.modeCardSelected]}
          onPress={() => setSessionMode('physical')}
          activeOpacity={0.8}
        >
          <View style={styles.modeCardLeft}>
            <View style={styles.buildingIconBox}><Ionicons name="business-outline" size={22} color="#6A1B9A" /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modeTitle, sessionMode === 'physical' && { color: '#6A1B9A' }]}>Physical Session</Text>
              <Text style={styles.modeSubtitle}>At SLIIT Campus, Lab Room 401</Text>
            </View>
          </View>
          <View style={[styles.radioCircle, sessionMode === 'physical' && styles.radioCircleSelected]}>
            {sessionMode === 'physical' && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        {sessionMode === 'physical' && (
          <View style={styles.venueInputContainer}>
            <TextInput
              style={styles.venueInput}
              value={venueAddress}
              onChangeText={setVenueAddress}
              placeholder="Enter campus venue or lab room"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        )}

        {/* Capacity & Pricing */}
        <Text style={[styles.sectionHeading, { marginTop: 24, marginBottom: 12 }]}>Capacity & Pricing</Text>
        <View style={styles.capacityPricingCard}>
          <View style={styles.capacityTopRow}>
            <Text style={styles.capacityLabel}>Group Capacity Limit</Text>
            <View style={styles.capacityLimitBadge}>
              <Text style={styles.capacityLimitBadgeText}>{maxCapacity} Students Max</Text>
            </View>
          </View>

          <View style={styles.stepperRow}>
            <TouchableOpacity style={styles.stepBtn} onPress={handleDecreaseCapacity} activeOpacity={0.7}>
              <Text style={styles.stepBtnText}>-</Text>
            </TouchableOpacity>

            <View style={styles.stepperMiddle}>
              <View style={styles.stepperProgressTrack}>
                <View style={[styles.stepperProgressFill, { width: `${(bookedCount / maxCapacity) * 100}%` }]} />
              </View>
              <View style={styles.stepperLegendRow}>
                <Text style={styles.bookedText}>{bookedCount} Booked</Text>
                <Text style={styles.remainingGoldText}>{seatsRemaining} Seats Remaining</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.stepBtn} onPress={handleIncreaseCapacity} activeOpacity={0.7}>
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.feeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.feeLabel}>Session Fee per Student</Text>
              <Text style={styles.feeSubtitle}>Calculated per 1-hour session</Text>
            </View>
            <View style={styles.feeInputWrapper}>
              <TextInput
                style={styles.feeInput}
                keyboardType="numeric"
                value={sessionFee}
                onChangeText={setSessionFee}
              />
            </View>
          </View>
        </View>

        {/* Accepting Bookings Toggle Card */}
        <View style={styles.toggleCard}>
          <View style={styles.warningCircle}><Text style={styles.warningExclamation}>!</Text></View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.toggleTitle}>Accepting Bookings</Text>
            <Text style={styles.toggleSubtitle}>Allow students to reserve seats</Text>
          </View>
          <Switch
            value={isAcceptingBookings}
            onValueChange={setIsAcceptingBookings}
            trackColor={{ false: '#CBD5E1', true: '#6A1B9A' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Bottom Action Buttons */}
        {feedbackNotice}
        {!!loadError && <Text accessibilityRole="alert" style={styles.feedbackText}>Cannot save until the session loads. Use Retry above.</Text>}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Save & Update Session" style={[styles.saveSessionBtn, (loadingSession || !!loadError || savingSession || addingSlot) && { opacity: 0.5 }]} disabled={loadingSession || !!loadError || savingSession || addingSlot} onPress={handleSaveSession} activeOpacity={0.85}>
          <Ionicons name="checkmark" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.saveSessionBtnText}>{savingSession ? 'Saving...' : loadingSession ? 'Loading Session...' : addingSlot ? 'Checking Slot...' : 'Save & Update Session'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.previewStudentBtn}
          onPress={() => navigation?.navigate('ScheduleScreen', { preview: true, tutorName: selectedTutor, tutorId: currentUser?.tutorId || null, subject: courseTitle, fee: Number(sessionFee), year: selectedDayObj.year, month: selectedDayObj.month, date: selectedDay, rescheduleId: null })}
          activeOpacity={0.8}
        >
          <Text style={styles.previewStudentBtnText}>Preview Student View</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Course Modal */}
      <Modal visible={isEditCourseModalVisible} transparent animationType="fade" onRequestClose={() => setIsEditCourseModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.modalHeaderIconBadge}><Ionicons name="book" size={18} color="#6A1B9A" /></View>
                <Text style={styles.modalTitle}>Edit Course & Module</Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditCourseModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Update your subject, module code, and semester details</Text>

            <ScrollView style={{ maxHeight: 340, marginTop: 12 }} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>COURSE / SUBJECT TITLE</Text>
                <TextInput style={styles.textInput} value={editCourseTitle} onChangeText={setEditCourseTitle} placeholder="e.g. Data Structures & Algorithms" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>COURSE CODE</Text>
                <TextInput style={styles.textInput} value={editCourseCode} onChangeText={setEditCourseCode} placeholder="e.g. CS204" placeholderTextColor="#9CA3AF" autoCapitalize="characters" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>SUBTITLE / SEMESTER DETAILS</Text>
                <TextInput style={styles.textInput} value={editCourseSubtitle} onChangeText={setEditCourseSubtitle} placeholder="e.g. CS204 • Year 2 Semester 1" placeholderTextColor="#9CA3AF" />
              </View>
            </ScrollView>

            {feedbackNotice}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsEditCourseModalVisible(false)} activeOpacity={0.8}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveCourseModal} activeOpacity={0.85}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.modalSaveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Slot Modal */}
      <Modal visible={isAddSlotModalVisible} transparent animationType="fade" onRequestClose={() => setIsAddSlotModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Time Slot</Text>
              <TouchableOpacity onPress={() => setIsAddSlotModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Date: {selectedDay} {displayMonthYear}</Text>
            {feedbackNotice}
            {addingSlot && <Text style={styles.modalSubtitle}>Checking availability...</Text>}

            <ScrollView style={{ maxHeight: 280, marginTop: 10 }}>
              {availableSlotOptions.map((opt) => (
                <TouchableOpacity key={opt} disabled={addingSlot} style={styles.slotOptionRow} onPress={() => handleSelectNewSlot(opt)}>
                  <Text style={styles.slotOptionText}>{opt}</Text>
                  <Ionicons name="add-circle-outline" size={20} color="#6A1B9A" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal visible={!!slotToRemove} transparent animationType="fade" onRequestClose={() => setSlotToRemove(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Remove Time Slot</Text>
            <Text style={styles.modalSubtitle}>Remove this time slot from your session and student view?</Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSlotToRemove(null)}>
                <Text style={styles.modalCancelBtnText}>Keep Slot</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={confirmRemoveSlot}>
                <Text style={styles.modalSaveBtnText}>Remove Slot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    backgroundColor: '#6A1B9A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerIconBtn: { padding: 4 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  headerRightIcons: { flexDirection: 'row', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 },
  tutorSelectorWrapper: {
    backgroundColor: '#FAF5FF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    padding: 12,
    marginBottom: 16,
  },
  tutorSelectLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6A1B9A',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  tutorDropdownBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8B4FE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tutorDropdownBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  tutorDropdownList: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  tutorDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  tutorDropdownItemActive: { backgroundColor: '#F3E8FF' },
  tutorDropdownItemText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  tutorDropdownItemTextActive: { color: '#6A1B9A', fontWeight: '700' },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  sectionSmallLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  changeLinkBtn: { flexDirection: 'row', alignItems: 'center' },
  changeLinkText: { fontSize: 13, fontWeight: '700', color: '#6A1B9A' },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  csBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  csBadgeText: { fontSize: 16, fontWeight: '800', color: '#6A1B9A' },
  courseDetails: { flex: 1 },
  courseTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  courseSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  activeBadge: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeBadgeText: { fontSize: 11, fontWeight: '700', color: '#16A34A' },
  scheduleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 12,
  },
  sectionHeading: { fontSize: 16, fontWeight: '700', color: '#111827' },
  monthBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  monthBadgeText: { fontSize: 12, fontWeight: '700', color: '#6A1B9A' },
  dateStripRow: { flexDirection: 'row', justifyContent: 'space-between' },
  datePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 3,
  },
  datePillSelected: { backgroundColor: '#6A1B9A', borderColor: '#6A1B9A' },
  dayAbbr: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginBottom: 4 },
  dayAbbrSelected: { color: '#E9D5FF' },
  dayNum: { fontSize: 14, fontWeight: '700', color: '#111827' },
  dayNumSelected: { color: '#FFFFFF' },
  slotsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 10,
  },
  slotsHeading: { fontSize: 14, fontWeight: '700', color: '#111827' },
  slotsCountBadge: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  slotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  slotGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 12,
  },
  slotInfo: { flex: 1 },
  slotTimeText: { fontSize: 14, fontWeight: '700', color: '#111827' },
  slotPeriodText: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  emptySlotNotice: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  emptySlotNoticeText: { fontSize: 13, color: '#6B7280' },
  addSlotDashedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: '#FAFAFA',
    marginTop: 4,
  },
  addSlotDashedText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  modeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modeCardSelected: { borderColor: '#6A1B9A', backgroundColor: '#FAF5FF' },
  modeCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  laptopIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  buildingIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modeTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  modeSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: { borderColor: '#6A1B9A' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#6A1B9A' },
  venueInputContainer: { marginTop: -2, marginBottom: 10 },
  venueInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13,
    color: '#374151',
  },
  capacityPricingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  capacityTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  capacityLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  capacityLimitBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  capacityLimitBadgeText: { fontSize: 11, fontWeight: '700', color: '#6A1B9A' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 12 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 18, fontWeight: '700', color: '#374151' },
  stepperMiddle: { flex: 1 },
  stepperProgressTrack: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  stepperProgressFill: { height: '100%', backgroundColor: '#D48B06', borderRadius: 3 },
  stepperLegendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  bookedText: { fontSize: 11, color: '#6B7280' },
  remainingGoldText: { fontSize: 11, fontWeight: '700', color: '#D48B06' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 14 },
  feeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  feeLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  feeSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  feeInputWrapper: {
    width: 90,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  feeInput: { fontSize: 15, fontWeight: '700', color: '#111827', textAlign: 'right' },
  toggleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  warningCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningExclamation: { fontSize: 16, fontWeight: '800', color: '#D97706' },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  toggleSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  saveSessionBtn: {
    backgroundColor: '#D48B06',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  saveSessionBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  feedbackNotice: { marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: '#FEF2F2' },
  feedbackSuccess: { backgroundColor: '#DCFCE7' },
  feedbackText: { fontSize: 13, color: '#111827' },
  previewStudentBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  previewStudentBtnText: { color: '#4B5563', fontSize: 14, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    elevation: 6,
  },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalHeaderIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  modalSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2, marginBottom: 8 },
  slotOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  slotOptionText: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  modalSaveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#6A1B9A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});
