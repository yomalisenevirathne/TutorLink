import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, View, Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BottomTabBar({ currentScreen, navigation, accountScreen = 'studentProfile', includeBottomInset = false }) {
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const bottomInset = includeBottomInset ? insets.bottom : 0;
  // Login / Register screens වල Bottom Bar එක පෙන්වන්නේ නෑ
  const hideScreens = ['loading', 'login', 'selection', 'tutorReg', 'studentReg', 'verifyOtp'];
  if (keyboardVisible || hideScreens.includes(currentScreen)) {
    return null;
  }

  const activeColor = '#D49B35';
  const inactiveColor = '#222222';

  const tabs = [
    {
      name: 'Home',
      iconOutline: 'home-outline',
      iconFilled: 'home',
      target: 'SearchHomeScreen',
      isActive: currentScreen === 'SearchHomeScreen' || currentScreen === 'SearchScreen' || currentScreen === 'ResultsScreen',
    },
    {
      name: 'Bookings',
      iconOutline: 'calendar-outline',
      iconFilled: 'calendar',
      target: accountScreen === 'tutorProfile' ? 'ManageSessionScreen' : 'ScheduleScreen',
      isActive: ['ScheduleScreen', 'SessionPreferencesScreen', 'BookingSummaryScreen', 'ManageSessionScreen'].includes(currentScreen),
    },
    {
      name: 'My Bookings',
      iconOutline: 'calendar-number-outline',
      iconFilled: 'calendar-number',
      target: 'MyBookingsScreen',
      isActive: currentScreen === 'MyBookingsScreen',
    },
    {
      name: 'Payments',
      iconOutline: 'wallet-outline',
      iconFilled: 'wallet',
      target: 'paymentHistory',
      isActive: ['paymentHistory', 'payment', 'addCard', 'editCard', 'managePayments', 'paymentProcessing', 'paymentSuccess'].includes(currentScreen),
    },
    {
      name: 'Account',
      iconOutline: 'person-outline',
      iconFilled: 'person',
      target: accountScreen,
      isActive: currentScreen === 'studentProfile' || currentScreen === 'tutorProfile',
    },
  ];

  return (
    <View style={[styles.container, { height: 64 + bottomInset, paddingBottom: 6 + bottomInset }]}>
      {tabs.map((tab) => {
        const color = tab.isActive ? activeColor : inactiveColor;
        const iconName = tab.isActive ? tab.iconFilled : tab.iconOutline;

        return (
          <Pressable
            key={tab.name}
            style={styles.tabItem}
            onPress={() => navigation.navigate(tab.target)}>
            <Ionicons name={iconName} size={22} color={color} />
            <Text
              numberOfLines={1}
              style={[styles.tabText, { color, fontWeight: tab.isActive ? '700' : '500' }]}
            >
              {tab.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 64,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingBottom: 6,
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabText: {
    fontSize: 11,
  },
});
