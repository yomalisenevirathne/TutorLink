import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar } from 'react-native';

import LoadingScreen from './src/screens/LoadingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterSelectionScreen from './src/screens/RegisterSelectionScreen';
import TutorRegistrationScreen from './src/screens/TutorRegistrationScreen';
import StudentRegistrationScreen from './src/screens/StudentRegistrationScreen';
import EmailVerificationScreen from './src/screens/EmailVerificationScreen';
import StudentProfileScreen from './src/screens/StudentProfileScreen';
import TutorProfileScreen from './src/screens/TutorProfileScreen';

export default function App() {
  // Screen state navigation: 'loading' | 'login' | 'selection' | 'tutorReg' | 'studentReg' | 'verifyOtp' | 'studentProfile' | 'tutorProfile'
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [currentUser, setCurrentUser] = useState(null);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [demoOtpCode, setDemoOtpCode] = useState('');

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentScreen('login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

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
          />
        )}

        {currentScreen === 'tutorProfile' && (
          <TutorProfileScreen
            user={currentUser}
            onEditProfile={() => setCurrentScreen('tutorReg')}
            onLogout={handleLogout}
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
  content: {
    flex: 1,
  },
});
