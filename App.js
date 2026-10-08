import React, { useContext } from 'react';
import { StyleSheet, View, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { AppContext } from './src/context/AppContext';

// Authentication, account, and payment screens.
import LoadingScreen from './src/screens/LoadingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterSelectionScreen from './src/screens/RegisterSelectionScreen';
import TutorRegistrationScreen from './src/screens/TutorRegistrationScreen';
import StudentRegistrationScreen from './src/screens/StudentRegistrationScreen';
import EmailVerificationScreen from './src/screens/EmailVerificationScreen';
import StudentProfileScreen from './src/screens/StudentProfileScreen';
import TutorProfileScreen from './src/screens/TutorProfileScreen';
import PaymentHistoryScreen from './src/screens/PaymentHistoryScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import { apiService } from './src/services/api';

// --- Yomali's Booking Screens ---
import ScheduleScreen from './src/screens/ScheduleScreen';
import SessionPreferencesScreen from './src/screens/SessionPreferencesScreen';
import BookingSummaryScreen from './src/screens/BookingSummaryScreen';
import MyBookingsScreen from './src/screens/MyBookingsScreen';
// `screen` is reserved by Expo Router/React Navigation; use `page` for our route.
const screenPath = (screen) => ({ pathname: '/[page]', params: { page: screen } });
const publicScreens = ['loading', 'login', 'selection', 'tutorReg', 'studentReg', 'verifyOtp'];
const bookingScreens = ['ScheduleScreen', 'SessionPreferencesScreen', 'BookingSummaryScreen', 'MyBookingsScreen'];
const allScreens = [...publicScreens, ...bookingScreens, 'studentProfile', 'tutorProfile', 'paymentHistory', 'payment'];

export default function App() {
  const { page = 'loading' } = useLocalSearchParams();
  const currentScreen = typeof page === 'string' ? page : page[0];
  const setCurrentScreen = (next) => router.replace(screenPath(next));
  const {
    currentUser, setCurrentUser, verificationEmail, setVerificationEmail,
    demoOtpCode, setDemoOtpCode, myBookings, setMyBookings,
    currentBooking, setCurrentBooking, getCapacityForSlot,
  } = useContext(AppContext);
  const isPaymentHistory = currentScreen === 'paymentHistory';
  const isPaymentScreen = currentScreen === 'payment';
  const isBookingScreen = bookingScreens.includes(currentScreen);
  const accountScreen = currentUser?.role === 'Tutor' ? 'tutorProfile' : 'studentProfile';
  const openAccount = () => setCurrentScreen(accountScreen);
  const handleConfirmBooking = (booking) => {
    setMyBookings((previous) => [booking, ...previous.filter((item) => item.id !== booking.id)]);
    setCurrentBooking((previous) => ({ ...previous, rescheduleId: null }));
  };
  const handleCancelBooking = (id) => setMyBookings((previous) => previous.map((booking) =>
    booking.id === id ? { ...booking, status: 'Cancelled' } : booking));
  const handleDeleteBooking = (id) => setMyBookings((previous) => previous.filter((booking) => booking.id !== id));
  const handleCompleteBooking = (id) => setMyBookings((previous) => previous.map((booking) =>
    booking.id === id ? { ...booking, status: 'Completed' } : booking));
  const handleLogout = async () => {
    await apiService.logout();
    setCurrentUser(null);
    setMyBookings([]);
    setVerificationEmail('');
    setDemoOtpCode('');
    if (router.canDismiss()) router.dismissAll();
    setCurrentScreen('login');
  };

  const navigation = {
    navigate: (screenName, params = {}) => {
      if (!allScreens.includes(screenName)) return;
      setCurrentBooking((previous) => ({ ...previous, ...params }));
      router.navigate(screenPath(screenName));
    },
    goBack: () => {
      if (router.canGoBack()) router.back();
      else setCurrentScreen(currentUser ? accountScreen : 'login');
    },
  };
  if (!allScreens.includes(currentScreen)) return <Redirect href={screenPath(currentUser ? accountScreen : 'login')} />;
  if (!currentUser && !publicScreens.includes(currentScreen)) return <Redirect href={screenPath('login')} />;

  return (
      <SafeAreaView
        style={[styles.safeArea, (isPaymentHistory || isPaymentScreen) && styles.paymentSafeArea, isBookingScreen && styles.bookingSafeArea]}
        edges={isPaymentHistory || isPaymentScreen ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom']}
      >
        <StatusBar barStyle={isPaymentHistory || isPaymentScreen || isBookingScreen ? 'light-content' : 'dark-content'} />

      <View style={styles.content}>
        {/* Authentication and account flow */}
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
                navigation.navigate('verifyOtp');
              }}
              onRegistrationSuccess={(user) => {
                setCurrentUser(user);
                setCurrentScreen('tutorProfile');
              }}
              onBack={() => setCurrentScreen(currentUser ? accountScreen : 'selection')}
            />
          )}

          {currentScreen === 'studentReg' && (
            <StudentRegistrationScreen
              user={currentUser}
              onRegistrationSuccess={(user) => {
                setCurrentUser(user);
                setCurrentScreen('studentProfile');
              }}
              onBack={() => setCurrentScreen(currentUser ? accountScreen : 'selection')}
            />
          )}

          {currentScreen === 'verifyOtp' && (
            <EmailVerificationScreen
              email={verificationEmail}
              demoOtp={demoOtpCode}
              onVerificationSuccess={() => currentUser ? openAccount() : navigation.goBack()}
              onBack={navigation.goBack}
            />
          )}

          {currentScreen === 'studentProfile' && (
            <StudentProfileScreen
              user={currentUser}
              navigation={navigation}
              onNavigateToBookings={() => navigation.navigate('ScheduleScreen', { rescheduleId: null })}
              onEditProfile={() => setCurrentScreen('studentReg')}
              onLogout={handleLogout}
              onNavigateToPayments={() => setCurrentScreen('paymentHistory')}
            />
          )}

          {currentScreen === 'tutorProfile' && (
            <TutorProfileScreen
              user={currentUser}
              onEditProfile={() => setCurrentScreen('tutorReg')}
              onLogout={handleLogout}
              onNavigateToPayments={() => setCurrentScreen('paymentHistory')}
            />
          )}

        {isPaymentHistory && <PaymentHistoryScreen key={currentUser?.id} onBackToAccount={openAccount} userId={currentUser?.id} />}
        {isPaymentScreen && <PaymentScreen key={currentUser.id} booking={currentBooking.checkout} userId={currentUser.id} isDemo={!!currentUser.isDemo} onBack={() => navigation.goBack()} />}

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
            onNavigateToPayment={(checkout) => navigation.navigate('payment', { checkout })}
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  paymentSafeArea: { backgroundColor: '#7100FF' },
  bookingSafeArea: { backgroundColor: '#6A1B9A' },
  content: {
    flex: 1,
  },
});
