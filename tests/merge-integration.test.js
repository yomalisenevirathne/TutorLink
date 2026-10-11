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

function app(page, role = 'Student', initialState = {}) {
  const routes = [];
  const state = {
    currentUser: role ? { id: 'user-1', role } : null,
    currentBooking: { year: 2026, month: 9, date: 20, slot: '6:00 PM' },
    myBookings: [],
    ...initialState,
    setCurrentUser(user) { state.currentUser = user; },
    setCurrentBooking(update) { state.currentBooking = update(state.currentBooking); },
    setMyBookings(update) { state.myBookings = typeof update === 'function' ? update(state.myBookings) : update; },
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
      router: { navigate: (route) => routes.push(route), replace: (route) => routes.push(route) },
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

test('booking checkout keeps the selected tutor and adds the signed-in booker name', () => {
  const { state, routes, elements } = app('BookingSummaryScreen', 'Student', {
    currentUser: { id: 'user-1', role: 'Student', fullName: 'Anju Silva' },
  });
  const summary = load('src/screens/BookingSummaryScreen.js', (name) => {
    if (name === 'react') return {
      __esModule: true, default: require('react'), useState: () => [false, () => {}],
    };
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react-native') return new Proxy({ StyleSheet: { create: value => value } }, {
      get: (target, key) => key in target ? target[key] : key,
    });
    if (name === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
    if (name.includes('bookingService')) return { createBookingInDb: () => assert.fail('Checkout must use the linked payment flow') };
    if (name.includes('BookingSuccessModal')) return { __esModule: true, default: 'BookingSuccessModal' };
    throw new Error('Unexpected dependency: ' + name);
  }).default;
  const props = elements.find(element => element.type === 'BookingSummaryScreen').props;
  const element = summary({ ...props, currentBooking: {
    tutor: { id: 'physics-tutor', name: 'Kavisha Perera', hourlyRate: 900 },
    subject: 'Physics', year: 2026, month: 9, date: 20, slot: '6:00 PM',
    mode: 'online', groupSize: 'small',
  } });
  function pay(node) {
    if (Array.isArray(node)) return node.map(pay).find(Boolean);
    if (!node?.props) return null;
    if (node.props.children?.props?.children === 'Pay') return node.props.onPress;
    return pay(node.props.children);
  }
  const onPress = pay(element);
  assert.equal(typeof onPress, 'function');
  onPress();
  assert.equal(routes[0].params.page, 'payment');
  assert.equal(state.currentBooking.checkout.tutorName, 'Kavisha Perera');
  assert.equal(state.currentBooking.checkout.tutorId, 'physics-tutor');
  assert.equal(state.currentBooking.checkout.subject, 'Physics');
  assert.equal(state.currentBooking.checkout.bookerName, 'Anju Silva');
  assert.equal(state.currentBooking.checkout.total, 950);
});

test('confirmed linked payment updates My Bookings and receipt without duplicating a reschedule', () => {
  const { state, routes, elements } = app('paymentProcessing', 'Student', {
    currentBooking: { rescheduleId: 'booking-1', paymentReceipt: { isDemo: true, ownerId: 'user-1' } },
    myBookings: [{ id: 'booking-1', slot: 'old time' }, { id: 'booking-2' }],
  });
  const booking = { id: 'booking-1', slot: '6:00 PM', tutor_name: 'Kavisha Perera', subject: 'Physics' };
  elements.find(element => element.type === 'PaymentProcessingScreen').props.onComplete({
    id: 'payment-1', booking_id: 'booking-1', booker_name: 'Anju Silva', booking,
  });
  assert.deepEqual(state.myBookings, [booking, { id: 'booking-2' }]);
  assert.equal(state.currentBooking.paymentReceipt.bookingId, 'booking-1');
  assert.equal(state.currentBooking.paymentReceipt.bookerName, 'Anju Silva');
  assert.equal(state.currentBooking.paymentReceipt.paymentId, 'payment-1');
  assert.equal(state.currentBooking.rescheduleId, null);
  assert.equal(routes[0].params.page, 'paymentSuccess');
});

test('signed-out users cannot open Home or discovery screens through direct routes', () => {
  for (const page of [undefined, 'SearchHomeScreen', 'SearchScreen', 'ResultsScreen', 'CompareScreen', 'FavoritesScreen', 'SearchTutorProfileScreen']) {
    const { elements } = app(page, null);
    const redirect = elements.find(element => element.type === 'Redirect');
    assert.equal(redirect?.props.href.params.page, 'login');
    assert.ok(!elements.some(element => element.type === 'HomeScreen'));
    assert.ok(!elements.some(element => element.type === 'BottomTabBar'));
  }
});

test('login and registration stay accessible without exposing app tabs', () => {
  for (const page of ['login', 'selection', 'tutorReg', 'studentReg', 'verifyOtp']) {
    const { elements } = app(page, null);
    assert.ok(!elements.some(element => element.type === 'Redirect'));
    assert.ok(!elements.some(element => element.type === 'BottomTabBar'));
  }
});

test('authenticated students and tutors can open Home and use app tabs', () => {
  for (const role of ['Student', 'Tutor']) {
    const { elements } = app('SearchHomeScreen', role);
    assert.ok(elements.some(element => element.type === 'HomeScreen'));
    assert.ok(elements.some(element => element.type === 'BottomTabBar'));
    assert.ok(!elements.some(element => element.type === 'Redirect'));
  }
});

test('successful login sends both students and tutors to Home', () => {
  for (const role of ['Student', 'Tutor']) {
    const { state, routes, elements } = app('login', null);
    const user = { id: 'logged-in-user', role };
    elements.find(element => element.type === 'LoginScreen').props.onLoginSuccess(user);
    assert.equal(state.currentUser, user);
    assert.equal(routes[0].params.page, 'SearchHomeScreen');
  }
});

function reviewsPanel({ reviews = [], loading = false, unavailable = false } = {}) {
  const React = require('react');
  const states = [reviews, loading, unavailable];
  let stateIndex = 0;
  let opened = 0;
  let requests = 0;
  const routes = [];
  const Reviews = load('src/components/TutorProfileReviews.js', (name) => {
    if (name === 'react') return {
      __esModule: true, default: React,
      useState: () => [states[stateIndex++], () => {}],
      useRef: () => ({ current: null }),
      useCallback: (callback) => callback,
    };
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react-native') return require('react-native-web');
    if (name === 'expo-router') return {
      useFocusEffect: () => {}, router: { push: (route) => routes.push(route) },
    };
    if (name.includes('RatingStars')) return {
      RatingStars: ({ rating }) => React.createElement('span', null, rating),
    };
    if (name.includes('tutorProfileReviews')) return {
      fetchTutorProfileReviews: async () => { requests++; return []; },
    };
    throw new Error('Unexpected dependency: ' + name);
  }).default;
  const element = Reviews({ tutorId: 'tutor-2', styles: {}, onOpenFeedback: () => { opened++; } });
  const controls = new Map();
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node?.props) return;
    if (node.props.onPress) controls.set(node.props.accessibilityLabel, node.props.onPress);
    visit(node.props.children);
  }
  visit(element);
  return { element, controls, routes, opened: () => opened, requests: () => requests };
}

const profileReview = { id: 'review-1', rating: 5, text: 'Helpful lesson', authorName: 'Student' };

test('review content, retry and View all render without nested HTML buttons in every loading state', () => {
  const { renderToStaticMarkup } = require('react-dom/server');
  for (const state of [{ loading: true }, {}, { unavailable: true }, { reviews: [profileReview] }]) {
    const html = renderToStaticMarkup(reviewsPanel(state).element);
    let depth = 0;
    for (const match of html.matchAll(/<\/?button\b[^>]*>/g)) {
      depth += match[0].startsWith('</') ? -1 : 1;
      assert.ok(depth <= 1, 'A button must never contain another button');
    }
    assert.equal(depth, 0);
    assert.match(html, /<button\b/);
  }
});

test('review actions independently open feedback, navigate to tutor comments and retry failed loads', async () => {
  const panel = reviewsPanel({ reviews: [profileReview] });
  panel.controls.get('Open tutor reviews and leave feedback')();
  assert.equal(panel.opened(), 1);
  panel.controls.get('View all feedback and comments for this tutor')();
  assert.equal(panel.opened(), 1);
  assert.deepEqual(panel.routes[0].params, { page: 'feedbackComments', tutorId: 'tutor-2' });
  const failedPanel = reviewsPanel({ unavailable: true });
  failedPanel.controls.get('Retry loading tutor reviews')();
  await Promise.resolve();
  assert.equal(failedPanel.requests(), 1);
  assert.equal(failedPanel.opened(), 0);
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
