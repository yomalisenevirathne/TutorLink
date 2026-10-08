const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('@babel/core');

function service(response = { data: [], error: null }) {
  const requests = [];
  const supabase = {
    from(table) {
      const request = { table };
      requests.push(request);
      const query = {
        insert(rows) { request.insert = rows; return query; },
        update(row) { request.update = row; return query; },
        delete() { request.delete = true; return query; },
        eq(column, value) { request.filter = [column, value]; return query; },
        select() { return query; },
        order() { return query; },
        then(resolve, reject) { return Promise.resolve(response).then(resolve, reject); },
      };
      return query;
    },
  };
  const { code } = transformSync(fs.readFileSync(path.join(__dirname, '../src/bookingService.js'), 'utf8'), {
    babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(() => ({ supabase }), module, module.exports);
  return { ...module.exports, requests };
}

const row = { id: 'booking-1', year: 2026, month: 1, date: 15, slot: '6:00 PM', group_size: 'small', status: 'Confirmed', total_fee: 750 };

test('January and December round-trip correctly between calendar and database', async () => {
  for (const month of [0, 11]) {
    const api = service({ data: [{ ...row, month: month + 1 }], error: null });
    const saved = await api.createBookingInDb({ ...row, month });
    assert.equal(api.requests[0].insert[0].month, month + 1);
    assert.equal(saved.month, month);
    assert.equal((await api.fetchAllBookings())[0].month, month);
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
