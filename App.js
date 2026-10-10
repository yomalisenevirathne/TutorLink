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
import MyBookingsScreen from './src/screens/MyBookingsScreen';
import { fetchAllBookings } from './src/bookingService';


// --- upeksha's Search Flow ---
import { HomeScreen as SearchHomeScreen } from './src/features/search/screens/HomeScreen';
import { SearchScreen } from './src/features/search/screens/SearchScreen';
import { ResultsScreen } from './src/features/search/screens/ResultsScreen';
import { CompareScreen } from './src/features/search/screens/CompareScreen';
import { FavoritesScreen } from './src/features/search/screens/FavoritesScreen';
import { TutorProfileScreen as SearchTutorProfileScreen } from './src/features/search/screens/TutorProfileScreen';
import { DiscoveryProvider } from './src/features/search/context/DiscoveryContext';

export default function App() {
  // Current screen state
  const [currentScreen, setCurrentScreen] = useState('SearchHomeScreen');
  const [screenHistory, setScreenHistory] = useState(['SearchHomeScreen']);

  const [currentUser, setCurrentUser] = useState(null);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [demoOtpCode, setDemoOtpCode] = useState('');

  const today = new Date();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Real-time Capacity Database (Yomali's Booking Logic)
  const [sessionCapacities, setSessionCapacities] = useState({});

  // Dynamic Bookings State (Upcoming & Past)
  const [myBookings, setMyBookings] = useState([]);

  // Fetch real live bookings from Supabase on launch
  useEffect(() => {
    const loadInitialBookings = async () => {
      try {
        const data = await fetchAllBookings();
        if (data && data.length > 0) {
          setMyBookings(data);
        }
      } catch (err) {
        console.log('Error fetching initial bookings in App.js:', err);
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

    // Add new booking dynamically to myBookings list
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
      const current = prev[key] || {
        privateBooked: false,
        smallBookedCount: 0,
        largeBookedCount: 0,
      };

      if (actualGroupSize === 'private') {
        return { ...prev, [key]: { ...current, privateBooked: true } };
      } else if (actualGroupSize === 'small') {
        return {
          ...prev,
          [key]: { ...current, smallBookedCount: Math.min(5, current.smallBookedCount + 1) },
        };
      } else if (actualGroupSize === 'large') {
        return {
          ...prev,
          [key]: { ...current, largeBookedCount: Math.min(10, current.largeBookedCount + 1) },
        };
      }
      return prev;
    });
  };

  const handleCancelBooking = (bookingId) => {
    setMyBookings((prev) => prev.filter((b) => b.id !== bookingId));
  };

  const handleDeleteBooking = (bookingId) => {
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

  // Global Navigation Controller
  const navigation = {
    navigate: (screenName, params = {}) => {
      if (params) {
        setCurrentBooking((prev) => ({ ...prev, ...params }));
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
        if (currentScreen === 'SearchScreen' || currentScreen === 'ResultsScreen' || currentScreen === 'SearchTutorProfileScreen') {
          setCurrentScreen('SearchHomeScreen');
        } else if (currentScreen === 'FavoritesScreen' || currentScreen === 'CompareScreen') {
          setCurrentScreen('SearchHomeScreen');
        } else if (currentScreen === 'MyBookingsScreen' || currentScreen === 'SessionPreferencesScreen') {
          setCurrentScreen('ScheduleScreen');
        } else if (currentScreen === 'BookingSummaryScreen') {
          setCurrentScreen('SessionPreferencesScreen');
        } else if (currentScreen === 'studentProfile') {
          setCurrentScreen('ScheduleScreen');
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
          <LoadingScreen onFinishLoading={() => setCurrentScreen('login')} />
        )}

        {currentScreen === 'login' && (
          <LoginScreen
            onLoginSuccess={(user) => {
              setCurrentUser(user);
              if (user.role === 'Tutor') {
                setCurrentScreen('tutorProfile');
              } else {
                setCurrentScreen('studentProfile');
              }
            }}
            onNavigateToRegister={() => setCurrentScreen('selection')}
          />
        )}

        {currentScreen === 'selection' && (
          <RegisterSelectionScreen
            onSelectRole={(role) => {
              if (role === 'Tutor') {
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
            user={currentUser}
            onNavigateToVerifyOtp={(email, otp) => {
              setVerificationEmail(email);
              setDemoOtpCode(otp);
              setCurrentScreen('verifyOtp');
            }}
            onRegistrationSuccess={(user) => {
              setCurrentUser(user);
              setCurrentScreen('tutorProfile');
            }}
            onBack={() => setCurrentScreen('selection')}
          />
        )}

        {currentScreen === 'studentReg' && (
          <StudentRegistrationScreen
            onRegistrationSuccess={(user) => {
              setCurrentUser(user);
              setCurrentScreen('studentProfile');
            }}
            onBack={() => setCurrentScreen('selection')}
          />
        )}

        {currentScreen === 'verifyOtp' && (
          <EmailVerificationScreen
            email={verificationEmail}
            demoOtp={demoOtpCode}
            onVerificationSuccess={() => {
              if (currentUser?.role === 'Tutor') {
                setCurrentScreen('tutorProfile');
              } else {
                setCurrentScreen('studentProfile');
              }
            }}
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
            onEditProfile={() => setCurrentScreen('tutorReg')}
            onDeleteProfile={() => {
              setCurrentUser(null);
              setCurrentScreen('login');
            }}
            onLogout={handleLogout}
          />
        )}

        {/* ================= 2. YOMALI'S BOOKING FLOW ================= */}
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

        {currentScreen === 'MyBookingsScreen' && (
          <MyBookingsScreen
            navigation={navigation}
            myBookings={myBookings}
            onCancelBooking={handleCancelBooking}
            onCompleteBooking={handleCompleteBooking}
            onDeleteBooking={handleDeleteBooking}
          />
        )}

        {/* ================= 3. SEARCH FLOW ================= */}
        <DiscoveryProvider>
          {currentScreen === 'SearchHomeScreen' && (
            <SearchHomeScreen navigation={navigation} />
          )}
          {currentScreen === 'SearchScreen' && (
            <SearchScreen navigation={navigation} />
          )}
          {currentScreen === 'ResultsScreen' && (
            <ResultsScreen navigation={navigation} />
          )}
          {currentScreen === 'CompareScreen' && (
            <CompareScreen navigation={navigation} />
          )}
          {currentScreen === 'FavoritesScreen' && (
            <FavoritesScreen navigation={navigation} />
          )}
          {currentScreen === 'SearchTutorProfileScreen' && (
            <SearchTutorProfileScreen navigation={navigation} id={currentBooking.tutorId} />
          )}
        </DiscoveryProvider>
      </View>
      <BottomTabBar currentScreen={currentScreen} navigation={navigation} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
});