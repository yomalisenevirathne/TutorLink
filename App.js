import React, { useState } from 'react';
import ScheduleScreen from './src/screens/ScheduleScreen';
import SessionPreferencesScreen from './src/screens/SessionPreferencesScreen';
import BookingSummaryScreen from './src/screens/BookingSummaryScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('ScheduleScreen');

  // Real-time Slot & Capacity Database (Keyed by "Year-Month-Day-Time")
  // උදා: "2026-8-15-6:00 PM"
  const [sessionCapacities, setSessionCapacities] = useState({
    // Test data for Sep 15 at 6:00 PM (Sample: Small group has 3 students, Large has 10)
    '2026-8-15-6:00 PM': {
      privateBooked: false,
      smallBookedCount: 3, // max 5 -> 2 seats left
      largeBookedCount: 10, // max 10 -> Fully Booked
    },
  });

  const [currentBooking, setCurrentBooking] = useState({
    year: 2026,
    month: 8,
    monthName: 'September',
    date: 15,
    slot: '6:00 PM',
    mode: 'physical',
    groupSize: 'small',
  });

  // Helper: ලබාගත් Date + Time එකට අදාළ capacity ලබාගැනීම
  const getCapacityForSlot = (year, month, date, slot) => {
    const key = `${year}-${month}-${date}-${slot}`;
    if (!sessionCapacities[key]) {
      // අලුත් දවසක් නම් සියල්ල Free/Available වේ
      return {
        privateBooked: false,
        smallBookedCount: 0,
        largeBookedCount: 0,
      };
    }
    return sessionCapacities[key];
  };

  // REAL BOOKING LOGIC: Pay කළ විට අදාළ Date & Slot එකේ capacity update කිරීම
  const handleConfirmBooking = (bookingData) => {
    const { year, month, date, slot, groupSize } = bookingData;
    const key = `${year}-${month}-${date}-${slot}`;

    setSessionCapacities((prev) => {
      const current = prev[key] || {
        privateBooked: false,
        smallBookedCount: 0,
        largeBookedCount: 0,
      };

      if (groupSize === 'private') {
        return { ...prev, [key]: { ...current, privateBooked: true } };
      } else if (groupSize === 'small') {
        return { ...prev, [key]: { ...current, smallBookedCount: Math.min(5, current.smallBookedCount + 1) } };
      } else if (groupSize === 'large') {
        return { ...prev, [key]: { ...current, largeBookedCount: Math.min(10, current.largeBookedCount + 1) } };
      }
      return prev;
    });
  };

  const navigation = {
    navigate: (screenName, params = {}) => {
      if (params) {
        setCurrentBooking((prev) => ({ ...prev, ...params }));
      }
      setCurrentScreen(screenName);
    },
    goBack: () => {
      if (currentScreen === 'BookingSummaryScreen') {
        setCurrentScreen('SessionPreferencesScreen');
      } else if (currentScreen === 'SessionPreferencesScreen') {
        setCurrentScreen('ScheduleScreen');
      }
    },
  };

  return (
    <>
      {currentScreen === 'ScheduleScreen' && (
        <ScheduleScreen
          navigation={navigation}
          currentBooking={currentBooking}
          getCapacityForSlot={getCapacityForSlot}
        />
      )}
      {currentScreen === 'SessionPreferencesScreen' && (
        <SessionPreferencesScreen
          navigation={navigation}
          currentBooking={currentBooking}
          getCapacityForSlot={getCapacityForSlot}
        />
      )}
      {currentScreen === 'BookingSummaryScreen' && (
        <BookingSummaryScreen
          navigation={navigation}
          currentBooking={currentBooking}
          onConfirm={handleConfirmBooking}
        />
      )}
    </>
  );
}