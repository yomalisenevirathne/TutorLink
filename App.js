import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar } from 'react-native';

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

export default function App() {
  // 💡 TIP: ඔයාගේ Booking part එක විතරක් test කරද්දී 'ScheduleScreen' තියාගන්න.
  // Full flow එක (Login සිට) බලද්දී මේක 'loading' කරන්න.
  const [currentScreen, setCurrentScreen] = useState('ScheduleScreen');

  const [currentUser, setCurrentUser] = useState(null);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [demoOtpCode, setDemoOtpCode] = useState('');

  // Real-time Capacity Database (Yomali's Booking Logic)
  const [sessionCapacities, setSessionCapacities] = useState({});

  const [currentBooking, setCurrentBooking] = useState({
    year: 2026,
    month: 8,
    monthName: 'September',
    date: 15,
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
    const { year = 2026, month = 8, date = 15, slot = '6:00 PM', groupSize = 'small' } = bookingData || {};
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
        return {
          ...prev,
          [key]: { ...current, smallBookedCount: Math.min(5, current.smallBookedCount + 1) },
        };
      } else if (groupSize === 'large') {
        return {
          ...prev,
          [key]: { ...current, largeBookedCount: Math.min(10, current.largeBookedCount + 1) },
        };
      }
      return prev;
    });
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
      setCurrentScreen(screenName);
    },
    goBack: () => {
      if (currentScreen === 'MyBookingsScreen') {
        setCurrentScreen('ScheduleScreen');
      } else if (currentScreen === 'BookingSummaryScreen') {
        setCurrentScreen('SessionPreferencesScreen');
      } else if (currentScreen === 'SessionPreferencesScreen') {
        setCurrentScreen('ScheduleScreen');
      }
    },
  };

  return (
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
            onEditProfile={() => setCurrentScreen('studentReg')}
            onLogout={handleLogout}
          />
        )}

        {currentScreen === 'tutorProfile' && (
          <TutorProfileScreen
            user={currentUser}
            onEditProfile={() => setCurrentScreen('tutorReg')}
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
          <MyBookingsScreen navigation={navigation} />
        )}
      </View>
    </SafeAreaView>
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