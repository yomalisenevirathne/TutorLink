import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { AppProvider } from '../context/AppContext';
import { DiscoveryProvider } from '../features/search/context/DiscoveryContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AppProvider>
        <DiscoveryProvider>
          <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
        </DiscoveryProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
