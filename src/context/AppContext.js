import React, { createContext, useEffect, useState } from 'react';
import { fetchAllBookings, capacityFromBookings } from '../bookingService';

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [demoOtpCode, setDemoOtpCode] = useState('');
  const [myBookings, setMyBookings] = useState([]);
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
    if (currentUser) fetchAllBookings().then((bookings) => {
      if (active) setMyBookings(bookings);
    }).catch((error) => console.error('Unable to load bookings:', error));
    return () => { active = false; };
  }, [currentUser]);
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
