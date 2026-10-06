import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import { colors } from '@/constants/colors';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home' },
  { name: 'bookings', title: 'Bookings', icon: 'calendar' },
  { name: 'payments', title: 'Payments', icon: 'wallet' },
  { name: 'account', title: 'Account', icon: 'person-circle' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={(focused ? t.icon : `${t.icon}-outline`) as IconName}
                color={color}
                size={size}
              />
            ),
          }}
        />
      ))}
      {/* Route still exists on disk; hide it from the tab bar rather than deleting the screen. */}
      <Tabs.Screen name="messages" options={{ href: null }} />
    </Tabs>
  );
}
