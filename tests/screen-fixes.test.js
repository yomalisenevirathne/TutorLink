const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('@babel/core');

// A small hook harness lets these tests exercise screen actions without a device.
function screen(file, dependencies = {}) {
  const slots = [];
  const alerts = [];
  let cursor = 0;
  let effects = [];
  const react = {
    __esModule: true, default: require('react'),
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((value, i) => value !== slots[index].deps[i])) slots[index] = { callback, deps };
      return slots[index].callback;
    },
  };
  const effect = (callback, deps = [callback]) => {
    const index = cursor++;
    if (!slots[index] || deps.some((value, i) => value !== slots[index].deps[i])) {
      slots[index]?.cleanup?.();
      slots[index] = { deps };
      effects.push(() => { slots[index].cleanup = callback(); });
    }
  };
  react.useEffect = effect;
  const modules = {
    react,
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': new Proxy({
      StyleSheet: { create: (value) => value }, Platform: { OS: 'web' },
      Alert: { alert: (...args) => alerts.push(args) },
    }, { get: (target, key) => key in target ? target[key] : key }),
    'expo-router': { useFocusEffect: (callback) => effect(callback) },
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    ...dependencies,
  };
  const { code } = transformSync(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    babelrc: false, configFile: false,
    plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }], '@babel/plugin-transform-modules-commonjs'],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => {
    assert.ok(name in modules, `Unexpected dependency ${name}`);
    return modules[name];
  }, module, module.exports);
  return {
    alerts,
    render(props) {
      cursor = 0;
      effects = [];
      const tree = module.exports.default(props);
      effects.forEach((run) => run());
      return tree;
    },
  };
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree?.props) return [];
  return [tree, ...nodes(tree.props.children)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree);
  return tree?.props ? text(tree.props.children) : '';
}
const action = (tree, label) => nodes(tree).find((node) => node.props.onPress && text(node) === label)?.props;
const flush = () => new Promise((resolve) => setImmediate(resolve));

function schedule(rows) {
  const query = {
    select: () => query, eq: () => query,
    then: (resolve, reject) => Promise.resolve({ data: rows, error: null }).then(resolve, reject),
  };
  return screen('src/screens/ScheduleScreen.js', { '../utils/supabase': { supabase: { from: () => query } } });
}
const today = new Date();
const booking = { year: today.getFullYear(), month: today.getMonth(), date: today.getDate(), tutorName: 'Tutor A' };

test('the calendar never substitutes another tutor when the selected tutor has no sessions', async () => {
  const view = schedule([{ tutor_name: 'Tutor B', date: booking.date, slots: ['8:00 AM - 9:00 AM'] }]);
  const props = { currentBooking: booking };
  view.render(props);
  await flush();
  const tree = view.render(props);
  assert.equal(action(tree, '8:00 AM - 9:00 AM'), undefined);
  assert.equal(action(tree, 'Continue').disabled, true);
});

test('changing the calendar month clears the selected slot before continuing', async () => {
  const slot = '8:00 AM - 9:00 AM';
  const view = schedule([{ id: 'session-1', tutor_name: 'Tutor A', date: booking.date, slots: [slot], fee: 925, mode: 'online' }]);
  const routes = [];
  const props = { currentBooking: booking, navigation: { navigate: (...args) => routes.push(args) } };
  view.render(props);
  await flush();
  action(view.render(props), slot).onPress();
  let tree = view.render(props);
  assert.equal(action(tree, 'Continue').disabled, false);
  action(tree, 'Continue').onPress();
  assert.equal(routes[0][1].sessionFee, 925);
  assert.equal(routes[0][1].mode, 'online');
  const next = nodes(tree).find((node) => node.props.onPress
    && nodes(node).some((child) => child.props.name === 'chevron-forward'));
  next.props.onPress();
  tree = view.render(props);
  assert.equal(action(tree, 'Continue').disabled, true);
});

test('OTP paste keeps six numeric digits and verification prevents duplicate requests', async () => {
  let requests = 0;
  let resolve;
  const view = screen('src/screens/EmailVerificationScreen.js', {
    '../services/api': { apiService: { verifyOtp: (email, code) => {
      requests++;
      assert.equal(code, '123456');
      return new Promise((done) => { resolve = done; });
    } } },
  });
  const props = { email: 'test@example.com' };
  const tree = view.render(props);
  nodes(tree).find((node) => node.type === 'TextInput').props.onChangeText('12x3456');
  const verify = action(view.render(props), 'Verify E-Mail').onPress;
  const first = verify();
  await verify();
  assert.equal(requests, 1);
  resolve({ success: true });
  await first;
});

test('a failed OTP resend displays an error and releases the loading state', async () => {
  const view = screen('src/screens/EmailVerificationScreen.js', {
    '../services/api': { apiService: { sendOtp: async () => { throw new Error('Network unavailable'); } } },
  });
  const props = { email: 'test@example.com' };
  await action(view.render(props), "Didn't receive code? Resend OTP").onPress();
  assert.equal(view.alerts[0][0], 'Resend Failed');
  assert.equal(action(view.render(props), "Didn't receive code? Resend OTP").disabled, false);
});

test('invalid booking fees never open payment or report booking success', () => {
  let opened = false;
  const view = screen('src/screens/BookingSummaryScreen.js');
  const tree = view.render({ currentBooking: { ...booking, slot: '8:00 AM', sessionFee: 'invalid' },
    onNavigateToPayment: () => { opened = true; } });
  action(tree, 'Pay').onPress();
  assert.equal(opened, false);
  assert.equal(view.alerts[0][0], 'Check Booking Details');
});

function manageSession(rows = [], services = {}, loadError = null) {
  return screen('src/screens/ManageSessionScreen.js', {
    '../utils/supabase': { supabase: { from: (table) => {
      const query = {
        select: () => query, eq: () => query,
        then: (resolve, reject) => Promise.resolve({
          data: table === 'tutor_sessions' ? rows : [], error: loadError,
        }).then(resolve, reject),
      };
      return query;
    } } },
    '../bookingService': { checkSlotConflict: async () => ({ hasConflict: false }),
      saveTutorSessionToDb: async () => ({}), ...services },
  });
}
const tutorProps = { currentUser: { fullName: 'Tutor A' } };
const sessionSlot = '8:00 AM - 9:00 AM';
const mainContent = (tree) => nodes(tree).find((node) => node.type === 'ScrollView');

test('saving without slots shows visible web validation and does not write', async () => {
  let writes = 0;
  const view = manageSession([], { saveTutorSessionToDb: async () => { writes++; } });
  view.render(tutorProps);
  await flush();
  await action(view.render(tutorProps), 'Save & Update Session').onPress();
  assert.match(text(mainContent(view.render(tutorProps))), /Slot Required: Please configure at least one time slot/);
  assert.equal(writes, 0);
  assert.equal(view.alerts.length, 0);
});

test('session save writes once during repeated clicks and visibly reports success', async () => {
  let writes = 0;
  let complete;
  const view = manageSession([{ slots: [sessionSlot], fee: 1800 }], {
    saveTutorSessionToDb: (payload) => {
      writes++;
      assert.deepEqual(payload.slots, [sessionSlot]);
      assert.equal(payload.fee, 1800);
      assert.equal(payload.month, today.getMonth() + 1);
      return new Promise((resolve) => { complete = resolve; });
    },
  });
  view.render(tutorProps);
  await flush();
  const save = action(view.render(tutorProps), 'Save & Update Session').onPress;
  const pending = save();
  await save();
  assert.equal(writes, 1);
  assert.equal(action(view.render(tutorProps), 'Saving...').disabled, true);
  complete({ id: 'saved-session' });
  await pending;
  assert.match(text(mainContent(view.render(tutorProps))), /Session Saved: Your session/);
  assert.equal(action(view.render(tutorProps), 'Save & Update Session').disabled, false);
});

test('failed session saves show the returned error on web and allow retry', async () => {
  const view = manageSession([{ slots: [sessionSlot] }], {
    saveTutorSessionToDb: async () => { throw new Error('Permission denied'); },
  });
  view.render(tutorProps);
  await flush();
  await action(view.render(tutorProps), 'Save & Update Session').onPress();
  const tree = view.render(tutorProps);
  assert.match(text(mainContent(tree)), /Save Failed: Permission denied/);
  assert.equal(action(tree, 'Save & Update Session').disabled, false);
});

test('repeated slot selection while availability loads adds only one slot', async () => {
  let checks = 0;
  let complete;
  const view = manageSession([], { checkSlotConflict: () => {
    checks++;
    return new Promise((resolve) => { complete = resolve; });
  } });
  view.render(tutorProps);
  await flush();
  action(view.render(tutorProps), 'Add New Time Slot').onPress();
  const add = action(view.render(tutorProps), sessionSlot).onPress;
  const pending = add();
  await add();
  assert.equal(checks, 1);
  assert.equal(action(view.render(tutorProps), sessionSlot).disabled, true);
  complete({ hasConflict: false });
  await pending;
  const tree = view.render(tutorProps);
  assert.equal(nodes(tree).filter((node) => node.key === `slot-${sessionSlot}`).length, 1);
  assert.match(text(mainContent(tree)), /1 Active Slots/);
});

test('slot checks cannot add a slot to a different date after navigation', async () => {
  let complete;
  const view = manageSession([], { checkSlotConflict: () => new Promise((resolve) => { complete = resolve; }) });
  view.render(tutorProps);
  await flush();
  const tree = view.render(tutorProps);
  const pending = action(tree, sessionSlot).onPress();
  const days = nodes(tree).filter((node) => node.props.onPress && /^\d+-\d+$/.test(node.key || ''));
  days[1].props.onPress();
  view.render(tutorProps);
  await flush();
  complete({ hasConflict: false });
  await pending;
  assert.match(text(mainContent(view.render(tutorProps))), /0 Active Slots/);
});

test('duplicate saved slots are normalized before rendering', async () => {
  const view = manageSession([{ slots: [sessionSlot, ` ${sessionSlot} `, null] }, { slots: [sessionSlot] }]);
  view.render(tutorProps);
  await flush();
  const tree = view.render(tutorProps);
  assert.equal(nodes(tree).filter((node) => node.key === `slot-${sessionSlot}`).length, 1);
});

test('slot removal uses a visible confirmation and persists only after confirmation', async () => {
  const writes = [];
  const view = manageSession([{ slots: [sessionSlot] }], {
    saveTutorSessionToDb: async (payload) => { writes.push(payload); },
  });
  view.render(tutorProps);
  await flush();
  let tree = view.render(tutorProps);
  const remove = nodes(tree).find((node) => node.props.onPress
    && nodes(node).some((child) => child.props.name === 'trash-outline'));
  remove.props.onPress();
  tree = view.render(tutorProps);
  assert.ok(nodes(tree).some((node) => node.type === 'Modal' && node.props.visible && /Remove Time Slot/.test(text(node))));
  assert.equal(writes.length, 0);
  await action(tree, 'Remove Slot').onPress();
  assert.deepEqual(writes[0].slots, []);
  assert.equal(writes[0].isAcceptingBookings, false);
  assert.match(text(mainContent(view.render(tutorProps))), /Slot Removed/);
});

test('a failed session load explains why saving is disabled', async () => {
  const view = manageSession([], {}, { message: 'Network unavailable' });
  view.render(tutorProps);
  await flush();
  const tree = view.render(tutorProps);
  assert.equal(action(tree, 'Save & Update Session').disabled, true);
  assert.match(text(mainContent(tree)), /Cannot save until the session loads/);
  assert.ok(action(tree, 'Retry'));
});
