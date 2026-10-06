import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { Placeholder } from '@/components/Placeholder';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';

export default function AccountScreen() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <Placeholder icon="person-circle-outline" title="Account" message="Log in to book and message tutors.">
        <Button title="Log in" onPress={() => router.push('/login')} />
      </Placeholder>
    );
  }

  return (
    <Placeholder icon="person-circle-outline" title="Account" message={user.email ?? ''}>
      <Text style={styles.name}>{user.user_metadata?.name || 'Account holder'}</Text>
      <Button title="Log out" onPress={logout} />
    </Placeholder>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
});
