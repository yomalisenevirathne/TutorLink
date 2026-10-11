const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('@babel/core');

function service(response = { data: [], error: null }) {
  const requests = [];
  const supabase = {
    rpc(name, params) {
      requests.push({ rpc: name, params });
      return Promise.resolve(Array.isArray(response) ? response.shift() : response);
    },
    from(table) {
      const request = { table };
      requests.push(request);
      const query = {
        insert(rows) { request.insert = rows; return query; },
        update(row) { request.update = row; return query; },
        delete() { request.delete = true; return query; },
        eq(column, value) { request.filter = [column, value]; (request.filters ||= []).push([column, value]); return query; },
        select(columns) { request.select = columns; return query; },
        order() { return query; },
        range(start, end) { request.range = [start, end]; return query; },
        then(resolve, reject) { return Promise.resolve(Array.isArray(response) ? response.shift() : response).then(resolve, reject); },
      };
      return query;
    },
  };
  const { code } = transformSync(fs.readFileSync(path.join(__dirname, '../src/bookingService.js'), 'utf8'), {
    babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => name.includes('paymentIdentity')
    ? { getPaymentIdentity: async (userId) => ({ client: supabase, userId }) } : { supabase }, module, module.exports);
  return { ...module.exports, requests };
}

const row = { id: 'booking-1', year: 2026, month: 1, date: 15, slot: '6:00 PM', group_size: 'small', status: 'Confirmed', total_fee: 750 };

test('January and December round-trip correctly between calendar and database', async () => {
  for (const month of [0, 11]) {
    const api = service({ data: [{ ...row, month: month + 1 }], error: null });
    const saved = await api.createBookingInDb({ ...row, month });
    assert.equal(api.requests[0].insert[0].month, month + 1);
    assert.equal(saved.month, month);
    assert.equal((await api.fetchAllBookings({ id: 'student-1', role: 'Student' }))[0].month, month);
  }
});

test('booking history always scopes reads to the signed-in student or tutor', async () => {
  for (const [role, column] of [['Student', 'student_id'], ['Tutor', 'tutor_id']]) {
    const api = service();
    await api.fetchAllBookings({ id: 'owner-1', role });
    assert.deepEqual(api.requests[0].filter, [column, 'owner-1']);
  }
  const signedOut = service({ data: [row], error: null });
  assert.deepEqual(await signedOut.fetchAllBookings(), []);
  assert.equal(signedOut.requests.length, 0);
});

test('the capacity of one tutor never counts a different tutor at the same time', () => {
  const api = service();
  const bookings = [{ ...row, month: 0, tutor_name: 'Tutor A' }, { ...row, id: 'other', month: 0, tutor_name: 'Tutor B' }];
  assert.equal(api.capacityFromBookings(bookings, 2026, 0, 15, row.slot, null, 'Tutor A').smallBookedCount, 1);
});

test('availability uses the existing bookings table with the selected tutor and database month', async () => {
  const api = service({ data: [{ ...row, month: 12, tutor_name: 'Tutor A' }], error: null });
  assert.deepEqual(await api.fetchCapacityForSlot(2026, 11, 15, row.slot, null, 'Tutor A'), {
    privateBooked: false, smallBookedCount: 1, largeBookedCount: 0,
  });
  assert.equal(api.requests[0].table, 'bookings');
  assert.deepEqual(api.requests[0].filters, [
    ['tutor_name', 'Tutor A'], ['year', 2026], ['month', 12], ['date', 15], ['slot', row.slot], ['status', 'Confirmed'],
  ]);
  assert.equal(api.requests.some((request) => request.rpc), false);
});

test('missing or invalid availability never falls back to an empty booking count', async () => {
  for (const response of [
    { data: null, error: new Error('Permission denied') },
    { data: null, error: null },
  ]) await assert.rejects(service(response).fetchCapacityForSlot(2026, 0, 15, row.slot, null, 'Tutor A'));
});

test('availability excludes only a reschedule owned by the authenticated student', async () => {
  const booking = { ...row, tutor_name: 'Tutor A', student_id: 'student-1' };
  for (const [owner, expected] of [['student-1', 0], ['different-student', 1]]) {
    const api = service({ data: [booking], error: null });
    const capacity = await api.fetchCapacityForSlot(2026, 0, 15, row.slot, row.id, 'Tutor A', { id: owner, role: 'Student' });
    assert.equal(capacity.smallBookedCount, expected);
  }
});

test('availability reads all matching pages instead of silently stopping at the row limit', async () => {
  const page = Array.from({ length: 1000 }, (_, i) => ({ ...row, id: `booking-${i}`, tutor_name: 'Tutor A' }));
  const api = service([{ data: page, error: null }, { data: [{ ...row, id: 'last', tutor_name: 'Tutor A' }], error: null }]);
  const capacity = await api.fetchCapacityForSlot(2026, 0, 15, row.slot, null, 'Tutor A');
  assert.equal(capacity.smallBookedCount, 1001);
  assert.deepEqual(api.requests.map((request) => request.range), [[0, 999], [1000, 1999]]);
});

const session = { tutorName: 'Tutor A', year: 2026, month: 12, date: 15, slots: ['8:00 AM - 9:00 AM'], fee: 700, maxCapacity: 5 };
test('saving an existing tutor session updates its date and persists removal of the final slot', async () => {
  const api = service([{ data: [{ id: 'session-1' }], error: null }, { data: [{ id: 'session-1', slots: [] }], error: null }]);
  await api.saveTutorSessionToDb({ ...session, slots: [], isAcceptingBookings: false });
  assert.equal(api.requests[1].insert, undefined);
  assert.deepEqual(api.requests[1].update.slots, []);
  assert.equal(api.requests[1].update.is_accepting_bookings, false);
  assert.deepEqual(api.requests[1].filters, [['tutor_name', 'Tutor A'], ['year', 2026], ['month', 12], ['date', 15]]);
});

test('new tutor sessions insert once and invalid fees fail before reaching storage', async () => {
  const api = service([{ data: [], error: null }, { data: [{ id: 'new-session' }], error: null }]);
  await api.saveTutorSessionToDb(session);
  assert.equal(api.requests[1].insert[0].month, 12);
  for (const fee of [0, -1, NaN]) {
    const invalid = service();
    await assert.rejects(invalid.saveTutorSessionToDb({ ...session, fee }));
    assert.equal(invalid.requests.length, 0);
  }
});

test('missing sessions and unavailable storage never report a successful save', async () => {
  for (const response of [{ data: [], error: null }, { data: null, error: new Error('Offline') }]) {
    await assert.rejects(service(response).saveTutorSessionToDb(session));
  }
});

test('capacity counts only the selected month and confirmed bookings', () => {
  const api = service();
  const bookings = [
    { ...row, month: 0 },
    { ...row, id: 'adjacent-month', month: 1 },
    { ...row, id: 'cancelled', month: 0, status: 'Cancelled' },
    { ...row, id: 'completed', month: 0, status: 'Completed' },
  ];
  assert.deepEqual(api.capacityFromBookings(bookings, 2026, 0, 15, '6:00 PM'), {
    privateBooked: false, smallBookedCount: 1, largeBookedCount: 0,
  });
  assert.equal(api.capacityFromBookings(bookings, 2026, 0, 15, '6:00 PM', row.id).smallBookedCount, 0);
});

test('rescheduling updates the existing booking instead of inserting a duplicate', async () => {
  const api = service({ data: [row], error: null });
  const saved = await api.createBookingInDb({ ...row, month: 0, rescheduleId: row.id });
  assert.equal(saved.id, row.id);
  assert.equal(api.requests[0].insert, undefined);
  assert.deepEqual(api.requests[0].filter, ['id', row.id]);
});

test('database failures and denied writes never report booking success', async () => {
  for (const response of [{ data: null, error: new Error('Offline') }, { data: [], error: null }]) {
    const api = service(response);
    await assert.rejects(api.createBookingInDb({ ...row, month: 0 }));
    assert.equal((await api.cancelBookingInDb(row.id)).success, false);
    assert.equal((await api.completeBookingInDb(row.id)).success, false);
    assert.equal((await api.deleteBookingFromDb(row.id)).success, false);
  }
});

test('completed bookings persist their status and empty results clear booking history', async () => {
  const api = service({ data: [{ id: row.id }], error: null });
  assert.equal((await api.completeBookingInDb(row.id)).success, true);
  assert.deepEqual(api.requests[0].update, { status: 'Completed' });
  assert.deepEqual(await service().fetchAllBookings(), []);
});
