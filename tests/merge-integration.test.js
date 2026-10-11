const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('@babel/core');

function load(file, requireMock) {
  const { code } = transformSync(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    babelrc: false,
    configFile: false,
    plugins: [
      ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
      '@babel/plugin-transform-modules-commonjs',
    ],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(requireMock, module, module.exports);
  return module.exports;
}

function app(page, role = 'Student') {
  const routes = [];
  const state = {
    currentUser: { id: 'user-1', role },
    currentBooking: { year: 2026, month: 9, date: 20, slot: '6:00 PM' },
    myBookings: [],
    setCurrentBooking(update) { state.currentBooking = update(state.currentBooking); },
  };
  const App = load('App.js', (name) => {
    if (name === 'react') return {
      __esModule: true,
      default: require('react'),
      useCallback: (callback) => callback,
      useContext: () => state,
    };
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'expo-router') return {
      useLocalSearchParams: () => ({ page }),
      router: { navigate: (route) => routes.push(route) },
      Redirect: 'Redirect',
    };
    if (name === 'react-native') return {
      StyleSheet: { create: (styles) => styles }, View: 'View', StatusBar: 'StatusBar',
    };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    const screen = path.basename(name);
    return new Proxy({ __esModule: true, default: screen }, {
      get: (target, key) => key in target ? target[key] : key,
    });
  }).default;
  const elements = [];
  function visit(element) {
    if (Array.isArray(element)) return element.forEach(visit);
    if (!element || !element.props) return;
    elements.push(element);
    visit(element.props.children);
  }
  visit(App());
  return { state, routes, elements };
}

test('search navigation preserves selected tutor details when opening the booking flow', () => {
  const { state, routes, elements } = app('SearchHomeScreen');
  elements.find(element => element.type === 'HomeScreen').props.navigation.navigate('ScheduleScreen', {
    tutorId: 'tutor-2', tutorName: 'Selected Tutor', subject: 'Physics', hourlyRate: 900,
    photoUrl: 'https://example.com/tutor.jpg',
  });
  assert.equal(routes[0].params.page, 'ScheduleScreen');
  assert.equal(state.currentBooking.tutor.id, 'tutor-2');
  assert.equal(state.currentBooking.tutor.hourlyRate, 900);
  assert.equal(state.currentBooking.tutor.photoUrl, 'https://example.com/tutor.jpg');
  assert.equal(state.currentBooking.subject, 'Physics');
});

test('the merged app routes tutors to session management and exposes payment history', () => {
  const { routes, elements } = app('tutorProfile', 'Tutor');
  const profile = elements.find(element => element.type === 'TutorProfileScreen');
  profile.props.navigation.navigate('Bookings');
  assert.equal(routes[0].params.page, 'ManageSessionScreen');
  const payments = app('paymentHistory');
  assert.ok(payments.elements.some(element => element.type === 'PaymentHistoryScreen'));
});

test('booking success remains reachable after migration to Expo Router', () => {
  const { elements } = app('BookingSuccessScreen');
  assert.ok(elements.some(element => element.type === 'BookingSuccessScreen'));
  assert.ok(!elements.some(element => element.type === 'Redirect'));
});

test('Supabase keeps native storage promises and lets web select browser storage', async () => {
  for (const platform of ['web', 'android', 'ios']) {
    let auth;
    let calls = 0;
    load('src/utils/supabase.js', (name) => {
      if (name === 'react-native-url-polyfill/auto') return {};
      if (name === 'react-native') return { Platform: { OS: platform } };
      if (name === '@supabase/supabase-js') return {
        createClient: (_, __, options) => { auth = options.auth; return {}; },
      };
      if (name === 'expo-secure-store') return {
        getItemAsync: () => { calls++; return Promise.resolve(null); },
        setItemAsync: () => { calls++; return Promise.resolve(); },
        deleteItemAsync: () => { calls++; return Promise.resolve(); },
      };
      throw new Error('Unexpected dependency: ' + name);
    });
    if (platform === 'web') {
      assert.equal(auth.storage, undefined);
      assert.equal(calls, 0);
    } else {
      for (const [method, args] of [
        ['getItem', ['session']], ['setItem', ['session', 'value']], ['removeItem', ['session']],
      ]) {
        const pending = auth.storage[method](...args);
        assert.ok(pending instanceof Promise);
        await pending;
      }
      assert.equal(calls, 3);
    }
  }
});
