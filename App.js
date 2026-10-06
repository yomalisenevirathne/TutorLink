import React, { useState } from 'react';
import { StyleSheet, View, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';

import LoadingScreen from './src/screens/LoadingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterSelectionScreen from './src/screens/RegisterSelectionScreen';
import TutorRegistrationScreen from './src/screens/TutorRegistrationScreen';
import StudentRegistrationScreen from './src/screens/StudentRegistrationScreen';
import EmailVerificationScreen from './src/screens/EmailVerificationScreen';
import StudentProfileScreen from './src/screens/StudentProfileScreen';
import TutorProfileScreen from './src/screens/TutorProfileScreen';
import PaymentHistoryScreen from './src/screens/PaymentHistoryScreen';
import { apiService } from './src/services/api';

export default function App() {
  // Screen components stay in src/screens, including payment history.
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [currentUser, setCurrentUser] = useState(null);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [demoOtpCode, setDemoOtpCode] = useState('');
  const isPaymentHistory = currentScreen === 'paymentHistory';
  const openAccount = () => setCurrentScreen(currentUser?.role === 'Tutor' ? 'tutorProfile' : 'studentProfile');

  const handleLogout = async () => {
    await apiService.logout();
    setCurrentUser(null);
    setCurrentScreen('login');
  };

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <SafeAreaView
        style={[styles.safeArea, isPaymentHistory && styles.paymentSafeArea]}
        edges={isPaymentHistory ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom']}
      >
        <StatusBar barStyle={isPaymentHistory ? 'light-content' : 'dark-content'} backgroundColor={isPaymentHistory ? '#7100FF' : '#FFFFFF'} />

        {/* Main App Content View */}
        <View style={styles.content}>
          {currentScreen === 'loading' && (
            <LoadingScreen
              onFinishLoading={() => setCurrentScreen('login')}
            />
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

          {isPaymentHistory && (
            <PaymentHistoryScreen key={currentUser?.id} onBackToAccount={openAccount} userId={currentUser?.id} />
          )}
        </View>
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
  paymentSafeArea: {
    backgroundColor: '#7100FF',
  },
});
