import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';

type Props = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  message: string;
  children?: ReactNode;
};

/** Stand-in for tabs owned by other team modules. */
export function Placeholder({ icon, title, message, children }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.heading}>{title}</Text>
      <View style={styles.center}>
        <Ionicons name={icon} size={48} color={colors.primaryBorder} />
        <Text style={styles.message}>{message}</Text>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, padding: 20 },
  heading: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  message: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
