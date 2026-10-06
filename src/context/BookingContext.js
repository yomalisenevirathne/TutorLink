import React, { createContext, useState, useContext } from 'react';

const BookingContext = createContext();

export const BookingProvider = ({ children }) => {
  // සෑම දවසකටම අදාළ slots (Real dynamic storage)
  const [slotsData, setSlotsData] = useState({
    15: [
      { id: '15-m1', time: '8:00 AM', booked: false, group: 'Morning' },
      { id: '15-m2', time: '9:00 AM', booked: false, group: 'Morning' },
      { id: '15-m3', time: '10:00 AM', booked: false, group: 'Morning' },
      { id: '15-a1', time: '1:00 PM', booked: false, group: 'Afternoon' },
      { id: '15-a2', time: '2:00 PM', booked: false, group: 'Afternoon' },
      { id: '15-a3', time: '3:00 PM', booked: false, group: 'Afternoon' },
      { id: '15-e1', time: '5:00 PM', booked: false, group: 'Evening' },
      { id: '15-e2', time: '6:00 PM', booked: false, group: 'Evening' },
      { id: '15-e3', time: '7:00 PM', booked: false, group: 'Evening' },
    ],
  });

  // Group Capacity සහ මිල ගණන්
  const [groupPlans] = useState({
    private: { title: '1-on-1 Private', fee: 1200, max: 1, current: 0 },
    small: { title: 'Small Group (2-5)', fee: 700, max: 5, current: 3 }, // 3 booked, 2 left
    large: { title: 'Large Group (6-10)', fee: 400, max: 10, current: 10 }, // 10 booked -> Fully Booked
  });

  // පරිශීලකයා තෝරාගත් දත්ත තාවකාලිකව තබාගැනීම
  const [currentBooking, setCurrentBooking] = useState({
    date: 15,
    slot: null,
    mode: 'physical',
    groupSize: 'small',
  });

  // තෝරාගත් දවසට අදාළ slots ලබාගැනීම
  const getSlots = (date) => {
    if (!slotsData[date]) {
      // අලුත් දවසක් නම් fresh slots list එකක් සාදයි
      return [
        { id: `${date}-m1`, time: '8:00 AM', booked: false, group: 'Morning' },
        { id: `${date}-m2`, time: '9:00 AM', booked: false, group: 'Morning' },
        { id: `${date}-m3`, time: '10:00 AM', booked: false, group: 'Morning' },
        { id: `${date}-a1`, time: '1:00 PM', booked: false, group: 'Afternoon' },
        { id: `${date}-a2`, time: '2:00 PM', booked: false, group: 'Afternoon' },
        { id: `${date}-a3`, time: '3:00 PM', booked: false, group: 'Afternoon' },
        { id: `${date}-e1`, time: '5:00 PM', booked: false, group: 'Evening' },
        { id: `${date}-e2`, time: '6:00 PM', booked: false, group: 'Evening' },
        { id: `${date}-e3`, time: '7:00 PM', booked: false, group: 'Evening' },
      ];
    }
    return slotsData[date];
  };

  // Pay කළ පසු Slot එක Booked කර lock කිරීමේ Real Logic එක
  const lockSlotAndConfirm = (date, slotTime) => {
    setSlotsData((prev) => {
      const current = prev[date] || getSlots(date);
      const updated = current.map((s) =>
        s.time === slotTime ? { ...s, booked: true } : s
      );
      return { ...prev, [date]: updated };
    });
  };

  return (
    <BookingContext.Provider
      value={{
        getSlots,
        groupPlans,
        currentBooking,
        setCurrentBooking,
        lockSlotAndConfirm,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => useContext(BookingContext);