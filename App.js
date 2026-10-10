import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BottomTabBar from './src/components/BottomTabBar';

// --- Rashmika's Auth & Profile Screens (Original / Untouched) ---
import LoadingScreen from './src/screens/LoadingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterSelectionScreen from './src/screens/RegisterSelectionScreen';
import TutorRegistrationScreen from './src/screens/TutorRegistrationScreen';
import StudentRegistrationScreen from './src/screens/StudentRegistrationScreen';
import EmailVerificationScreen from './src/screens/EmailVerificationScreen';
import StudentProfileScreen from './src/screens/StudentProfileScreen';
import TutorProfileScreen from './src/screens/TutorProfileScreen';

// --- Yomali's Booking Screens ---
import ScheduleScreen from './src/screens/ScheduleScreen';
import SessionPreferencesScreen from './src/screens/SessionPreferencesScreen';
import BookingSummaryScreen from './src/screens/BookingSummaryScreen';
import BookingSuccessScreen from './src/screens/BookingSuccessScreen';
import MyBookingsScreen from './src/screens/MyBookingsScreen';
import ManageSessionScreen from './src/screens/ManageSessionScreen';
import { fetchAllBookings } from './src/bookingService';

// --- Upeksha's Search Flow ---
import { HomeScreen as SearchHomeScreen } from './src/features/search/screens/HomeScreen';
import { SearchScreen } from './src/features/search/screens/SearchScreen';
import { ResultsScreen } from './src/features/search/screens/ResultsScreen';
import { CompareScreen } from './src/features/search/screens/CompareScreen';
import { FavoritesScreen } from './src/features/search/screens/FavoritesScreen';
import { TutorProfileScreen as SearchTutorProfileScreen } from './src/features/search/screens/TutorProfileScreen';
import { DiscoveryProvider } from './src/features/search/context/DiscoveryContext';

export default function App() {
  // Current screen state & History for back navigation
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [screenHistory, setScreenHistory] = useState(['loading']);

  const [currentUser, setCurrentUser] = useState(null);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [demoOtpCode, setDemoOtpCode] = useState('');

  const today = new Date();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const [sessionCapacities, setSessionCapacities] = useState({});
  const [myBookings, setMyBookings] = useState([]);

  useEffect(() => {
    const loadInitialBookings = async () => {
      try {
        if (fetchAllBookings) {
          const data = await fetchAllBookings();
          if (data && data.length > 0) setMyBookings(data);
        }
      } catch (err) {
        console.log('Error fetching bookings:', err);
      }
    };
    loadInitialBookings();
  }, []);

  const [currentBooking, setCurrentBooking] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
    monthName: monthNames[today.getMonth()],
    date: today.getDate(),
    slot: '6:00 PM',
    mode: 'physical',
    groupSize: 'small',
  });

  const getCapacityForSlot = (year, month, date, slot) => {
    const key = `${year}-${month}-${date}-${slot}`;
    return sessionCapacities[key] || {
      privateBooked: false,
      smallBookedCount: 0,
      largeBookedCount: 0,
    };
  };

  const handleConfirmBooking = (bookingData) => {
    const {
      id,
      year = today.getFullYear(),
      month = today.getMonth(),
      date = today.getDate(),
      slot = '6:00 PM',
      groupSize = 'small',
      group_size = 'small',
      mode = 'physical',
      total_fee = 750,
      totalFee = 750,
      tutor_name = 'Sarith Samarakoon',
      tutorName = 'Sarith Samarakoon',
      subject = 'Data Structures & Algorithms',
    } = bookingData || {};

    const actualGroupSize = (groupSize || group_size || 'small').toLowerCase();
    const key = `${year}-${month}-${date}-${slot}`;

    const newBookingItem = {
      id: id || `booking-${Date.now()}`,
      tutor_name: tutor_name || tutorName,
      subject: subject,
      year,
      month,
      date,
      slot,
      mode,
      group_size: actualGroupSize,
      total_fee: total_fee || totalFee,
      status: 'Confirmed',
    };

    setMyBookings((prev) => [newBookingItem, ...prev]);

    setSessionCapacities((prev) => {
      const current = prev[key] || { privateBooked: false, smallBookedCount: 0, largeBookedCount: 0 };
      if (actualGroupSize === 'private') {
        return { ...prev, [key]: { ...current, privateBooked: true } };
      } else if (actualGroupSize === 'small') {
        return { ...prev, [key]: { ...current, smallBookedCount: Math.min(5, current.smallBookedCount + 1) } };
      } else if (actualGroupSize === 'large') {
        return { ...prev, [key]: { ...current, largeBookedCount: Math.min(10, current.largeBookedCount + 1) } };
      }
      return prev;
    });
  };

  const releaseSlotCapacity = (booking) => {
    if (!booking) return;
    const { year, month, date, slot, group_size, groupSize } = booking;
    const actualGroupSize = (group_size || groupSize || 'small').toLowerCase();
    const key = `${year}-${month}-${date}-${slot}`;

    setSessionCapacities((prev) => {
      const current = prev[key];
      if (!current) return prev;
      if (actualGroupSize === 'private') {
        return { ...prev, [key]: { ...current, privateBooked: false } };
      } else if (actualGroupSize === 'small') {
        return {
          ...prev,
          [key]: {
            ...current,
            smallBookedCount: Math.max(0, (current.smallBookedCount || 1) - 1),
          },
        };
      } else if (actualGroupSize === 'large') {
        return {
          ...prev,
          [key]: {
            ...current,
            largeBookedCount: Math.max(0, (current.largeBookedCount || 1) - 1),
          },
        };
      }
      return prev;
    });
  };

  const handleCancelBooking = (bookingId, bookingData) => {
    const booking = bookingData || myBookings.find((b) => b.id === bookingId);
    if (booking) releaseSlotCapacity(booking);
    setMyBookings((prev) => prev.filter((b) => b.id !== bookingId));
  };

  const handleDeleteBooking = (bookingId, bookingData) => {
    const booking = bookingData || myBookings.find((b) => b.id === bookingId);
    if (booking) releaseSlotCapacity(booking);
    setMyBookings((prev) => prev.filter((b) => b.id !== bookingId));
  };

  const handleCompleteBooking = (bookingId) => {
    setMyBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'Completed' } : b))
    );
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentScreen('login');
  };

  const isTutorUser = (user = currentUser) => {
    const roleStr = (user?.role || '').toString().trim().toLowerCase();
    return roleStr === 'tutor';
  };

  // Global Unified Navigation Controller
  const navigation = {
    navigate: (screenName, params = {}) => {
      if (params) {
        setCurrentBooking((prev) => {
          const tutorData = params.tutor || (params.tutorName ? {
            id: params.tutorId || prev?.tutor?.id,
            name: params.tutorName || prev?.tutor?.name,
            subject: params.subject || prev?.tutor?.subject,
            role: params.role || prev?.tutor?.role || 'University Tutor',
            university: params.university || prev?.tutor?.university || 'University',
            rating: params.rating || prev?.tutor?.rating || '4.8',
            hourlyRate: params.hourlyRate || params.fee || prev?.tutor?.hourlyRate || 700,
            fee: params.fee || params.hourlyRate || prev?.tutor?.fee || 700,
            photoUrl: params.photoUrl || prev?.tutor?.photoUrl,
          } : prev?.tutor);

          return {
            ...prev,
            ...params,
            tutor_name: params.tutorName || params.tutor_name || tutorData?.name || prev.tutor_name || 'Sarith Samarakoon',
            tutorName: params.tutorName || params.tutor_name || tutorData?.name || prev.tutorName || 'Sarith Samarakoon',
            subject: params.subject || tutorData?.subject || prev.subject || 'Data Structures & Algorithms',
            tutor: tutorData ? { ...(prev?.tutor || {}), ...tutorData } : prev?.tutor,
          };
        });
      }

      const isTutor = isTutorUser(currentUser);

      // Role-Based Bookings Navigation
      if (screenName === 'Bookings') {
        const target = isTutor ? 'ManageSessionScreen' : 'ScheduleScreen';
        setScreenHistory((prev) => [...prev, target]);
        setCurrentScreen(target);
        return;
      }

      if (screenName === 'ScheduleScreen' && isTutor && !params?.preview) {
        setScreenHistory((prev) => [...prev, 'ManageSessionScreen']);
        setCurrentScreen('ManageSessionScreen');
        return;
      }

      setScreenHistory((prev) => [...prev, screenName]);
      setCurrentScreen(screenName);
    },
    goBack: () => {
      setScreenHistory((prev) => {
        if (prev.length > 1) {
          const newHistory = prev.slice(0, -1);
          const previousScreen = newHistory[newHistory.length - 1];
          setCurrentScreen(previousScreen);
          return newHistory;
        }

        // Fallback default back routes if at the root
        if (
          currentScreen === 'SearchScreen' ||
          currentScreen === 'ResultsScreen' ||
          currentScreen === 'SearchTutorProfileScreen'
        ) {
          setCurrentScreen('SearchHomeScreen');
        } else if (currentScreen === 'FavoritesScreen' || currentScreen === 'CompareScreen') {
          setCurrentScreen('SearchHomeScreen');
        } else if (currentScreen === 'ManageSessionScreen') {
          setCurrentScreen(isTutorUser(currentUser) ? 'tutorProfile' : 'ScheduleScreen');
        } else if (currentScreen === 'BookingSuccessScreen') {
          setCurrentScreen('ScheduleScreen');
        } else if (currentScreen === 'MyBookingsScreen' || currentScreen === 'SessionPreferencesScreen') {
          setCurrentScreen('ScheduleScreen');
        } else if (currentScreen === 'BookingSummaryScreen') {
          setCurrentScreen('SessionPreferencesScreen');
        } else if (currentScreen === 'studentProfile') {
          setCurrentScreen('SearchHomeScreen');
        } else if (currentScreen === 'tutorProfile') {
          setCurrentScreen('login');
        }
        return ['SearchHomeScreen'];
      });
    },
  };

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <View style={styles.content}>
          {/* ================= 1. RASHMIKA'S FLOW (UNTOUCHED) ================= */}
          {currentScreen === 'loading' && (
            <LoadingScreen onFinishLoading={() => setTimeout(() => setCurrentScreen('login'), 0)} />
          )}

          {currentScreen === 'login' && (
            <LoginScreen
              onLoginSuccess={(user) => {
                const role = user?.role || user?.user_metadata?.role || (user?.email?.toLowerCase().includes('tutor') ? 'Tutor' : 'Student');
                const authUser = { ...(user || {}), role };
                setCurrentUser(authUser);
                if (role.toLowerCase() === 'tutor') {
                  setCurrentScreen('tutorProfile');
                } else {
                  setCurrentScreen('SearchHomeScreen');
                }
              }}
              onNavigateToRegister={() => setCurrentScreen('selection')}
            />
          )}

          {currentScreen === 'selection' && (
            <RegisterSelectionScreen
              onSelectRole={(role) => {
                const roleStr = (role || '').toString().trim().toLowerCase();
                if (roleStr === 'tutor') {
                  setCurrentScreen('tutorReg');
                } else {
                  setCurrentScreen('studentReg');
                }
              }}
              onBackToLogin={() => setCurrentScreen('login')}
            />
          )}

          {currentScreen === 'tutorReg' && (
            <TutorRegistrationScreen
              onNavigateToVerifyOtp={(email, otp) => {
                setVerificationEmail(email);
                setDemoOtpCode(otp);
                setCurrentScreen('verifyOtp');
              }}
              onRegistrationSuccess={(user) => {
                setCurrentUser({ ...(user || {}), role: 'Tutor' });
                setCurrentScreen('tutorProfile');
              }}
              onBack={() => setCurrentScreen('selection')}
            />
          )}

          {currentScreen === 'studentReg' && (
            <StudentRegistrationScreen
              onRegistrationSuccess={(user) => {
                setCurrentUser({ ...(user || {}), role: 'Student' });
                setCurrentScreen('SearchHomeScreen');
              }}
              onBack={() => setCurrentScreen('selection')}
            />
          )}

          {currentScreen === 'verifyOtp' && (
            <EmailVerificationScreen
              email={verificationEmail}
              demoOtp={demoOtpCode}
              onVerificationSuccess={() => setCurrentScreen('SearchHomeScreen')}
              onBack={() => setCurrentScreen('login')}
            />
          )}

          {currentScreen === 'studentProfile' && (
            <StudentProfileScreen
              user={currentUser}
              navigation={navigation}
              onNavigateToBookings={() => setCurrentScreen('ScheduleScreen')}
              onEditProfile={() => setCurrentScreen('studentReg')}
              onLogout={handleLogout}
            />
          )}

          {currentScreen === 'tutorProfile' && (
            <TutorProfileScreen
              user={currentUser}
              navigation={navigation}
              onCreateSession={() => setCurrentScreen('ManageSessionScreen')}
              onNavigateToBookings={() => setCurrentScreen('ManageSessionScreen')}
              onEditProfile={() => setCurrentScreen('tutorReg')}
              onLogout={handleLogout}
            />
          )}

          {/* ================= 2. YOMALI'S BOOKING & SESSION FLOW ================= */}
          {currentScreen === 'ManageSessionScreen' && (
            <ManageSessionScreen
              navigation={navigation}
              currentUser={currentUser || { role: 'Tutor', fullName: 'Sarith Samarakoon' }}
            />
          )}

          {currentScreen === 'ScheduleScreen' && (
            <ScheduleScreen
              navigation={navigation}
              currentBooking={currentBooking}
              getCapacityForSlot={getCapacityForSlot}
              currentUser={currentUser}
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

          {currentScreen === 'BookingSuccessScreen' && (
            <BookingSuccessScreen
              navigation={navigation}
              route={{ params: currentBooking }}
            />
          )}

          {currentScreen === 'MyBookingsScreen' && (
            <MyBookingsScreen
              navigation={navigation}
              myBookings={myBookings}
              onCancelBooking={handleCancelBooking}
              onCompleteBooking={handleCompleteBooking}
              onDeleteBooking={handleDeleteBooking}
            />
          )}

          {/* ================= 3. UPEKSHA'S SEARCH & DISCOVERY FLOW ================= */}
          <DiscoveryProvider>
            {currentScreen === 'SearchHomeScreen' && <SearchHomeScreen navigation={navigation} />}
            {currentScreen === 'SearchScreen' && <SearchScreen navigation={navigation} />}
            {currentScreen === 'ResultsScreen' && <ResultsScreen navigation={navigation} />}
            {currentScreen === 'CompareScreen' && <CompareScreen navigation={navigation} />}
            {currentScreen === 'FavoritesScreen' && <FavoritesScreen navigation={navigation} />}
            {currentScreen === 'SearchTutorProfileScreen' && (
              <SearchTutorProfileScreen navigation={navigation} id={currentBooking?.tutorId} />
            )}
          </DiscoveryProvider>
        </View>

        {/* Global Bottom Tab Bar */}
        <BottomTabBar currentScreen={currentScreen} navigation={navigation} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1 },
});