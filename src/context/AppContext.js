import React, { createContext, useCallback, useEffect, useState } from 'react';
import { fetchAllBookings, capacityFromBookings } from '../bookingService';

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [demoOtpCode, setDemoOtpCode] = useState('');
  const [bookingsState, setBookingsState] = useState({ ownerId: null, records: [] });
  const ownerId = currentUser?.id || null;
  const myBookings = bookingsState.ownerId === ownerId ? bookingsState.records : [];
  const setMyBookings = useCallback((update) => {
    setBookingsState((previous) => {
      const records = previous.ownerId === ownerId ? previous.records : [];
      return { ownerId, records: typeof update === 'function' ? update(records) : update };
    });
  }, [ownerId]);
  const [currentBooking, setCurrentBooking] = useState(() => {
    const today = new Date();
    return {
      year: today.getFullYear(), month: today.getMonth(), date: today.getDate(),
      monthName: today.toLocaleString('en-US', { month: 'long' }),
      slot: '6:00 PM', mode: 'physical', groupSize: 'small', rescheduleId: null,
    };
  });
  useEffect(() => {
    let active = true;
    if (currentUser) fetchAllBookings(currentUser).then((bookings) => {
      if (active) setMyBookings(bookings);
    }).catch((error) => console.error('Unable to load bookings:', error));
    return () => { active = false; };
  }, [currentUser, setMyBookings]);
  const getCapacityForSlot = (year, month, date, slot) => capacityFromBookings(
    myBookings.filter((booking) => booking.id !== currentBooking.rescheduleId), year, month, date, slot,
  );
  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser, verificationEmail, setVerificationEmail,
      demoOtpCode, setDemoOtpCode, myBookings, setMyBookings,
      currentBooking, setCurrentBooking, getCapacityForSlot,
    }}>
      {children}
    </AppContext.Provider>
  );
}
