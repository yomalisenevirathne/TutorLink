import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/colors';
import { AuthProvider } from '@/context/AuthContext';
import { DiscoveryProvider } from '@/features/search';

export default function RootLayout() {
  return (
    <AuthProvider>
      <DiscoveryProvider>
        <StatusBar style="dark" />
        {/* Mobile-first: on wide (web) screens the app is centred in a phone-width column. */}
        <View style={styles.outer}>
          <View style={styles.column}>
            <Stack screenOptions={{ headerShown: false }} />
          </View>
        </View>
      </DiscoveryProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, alignItems: 'center', backgroundColor: '#ECE8F4' },
  column: { flex: 1, width: '100%', maxWidth: 420, backgroundColor: colors.background },
});
