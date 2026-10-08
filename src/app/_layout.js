import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { AppProvider } from '../context/AppContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AppProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
      </AppProvider>
    </SafeAreaProvider>
  );
}
