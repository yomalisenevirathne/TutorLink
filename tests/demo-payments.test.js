const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('@babel/core');

const ownerId = '00000000-0000-0000-0000-000000000001';
const receipt = { isDemo: true, ownerId, reference: 'DEMO-TEST-12345', amount: 450, currency: 'LKR',
  tutorName: 'Sarith Samarakoon', subject: 'Data Structures & Algorithms',
  sessionDate: '2026-10-08', time: '7:00 PM', brand: 'Visa', last4: '1111' };
const row = { id: 'saved-demo-1', user_id: ownerId, reference: receipt.reference,
  counterparty_name: receipt.tutorName, amount: '450.00', currency: 'LKR', status: 'Demo',
  subject: receipt.subject, session_date: receipt.sessionDate, session_time: receipt.time,
  card_brand: receipt.brand, card_last4: receipt.last4, occurred_at: '2026-10-08T10:00:00Z' };

function service({ insertError = null, readError = null, saved = row, rows = [row], authOwner = ownerId,
  rpcData = null, rpcError = null } = {}) {
  const requests = [], identities = [];
  const client = { from(table) {
    const request = { table, filters: [] };
    requests.push(request);
    const query = {
      insert(value) { request.input = value; return query; },
      select() { return query; },
      single: async () => ({ data: request.input && insertError ? null : saved, error: request.input ? insertError : readError }),
      eq(column, value) { request.filters.push([column, value]); return query; },
      order() { return query; },
      range(start, end) { request.range = [start, end]; return query; },
      abortSignal() { return query; },
      then(resolve, reject) { return Promise.resolve({ data: rows.slice(request.range[0], request.range[1] + 1), error: readError }).then(resolve, reject); },
    };
    return query;
  } };
  client.rpc = async (name, input) => {
    requests.push({ rpc: name, input });
    return { data: rpcData, error: rpcError };
  };
  const { code } = transformSync(fs.readFileSync(path.join(__dirname, '../src/services/demoPayments.js'), 'utf8'), {
    babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => {
    assert.equal(name, './paymentIdentity');
    return { getPaymentIdentity: async (expected, options) => {
      identities.push({ expected, options });
      if (!authOwner || (!options.isDemo && expected !== authOwner)) throw Object.assign(new Error('Sign in again'), { code: 'AUTH_REQUIRED' });
      return { client, userId: authOwner };
    } };
  }, loaded, loaded.exports);
  return { ...loaded.exports, requests, identities };
}

test('saving a demo confirmation whitelists display fields and uses only the verified owner', async () => {
  const subject = service();
  const saved = await subject.saveDemoPayment({ ...receipt, ownerId: 'demo_fake',
    user_id: 'another-user', number: '4111111111111111', cvv: '123', status: 'Paid' }, { isDemo: true });
  assert.equal(saved.id, row.id);
  assert.deepEqual(subject.requests[0].input, { user_id: ownerId, reference: receipt.reference,
    counterparty_name: receipt.tutorName, amount: 450, currency: 'LKR', subject: receipt.subject,
    session_date: receipt.sessionDate, session_time: receipt.time, card_brand: 'Visa', card_last4: '1111' });
  assert.equal(subject.requests[0].table, 'demo_payments');
});

test('missing authentication, invalid amounts and real-payment receipts cannot create demo records', async () => {
  const unauthenticated = service({ authOwner: null });
  await assert.rejects(unauthenticated.saveDemoPayment(receipt), { code: 'AUTH_REQUIRED' });
  assert.equal(unauthenticated.requests.length, 0);
  for (const invalid of [{ amount: 0 }, { isDemo: false }, { last4: '4111111111111111' }, { reference: 'REAL-123' }]) {
    const subject = service();
    await assert.rejects(subject.saveDemoPayment({ ...receipt, ...invalid }), /Check your booking/);
    assert.equal(subject.requests.length, 0);
  }
});

test('database denial, absent storage and unconfirmed insert responses never report success', async () => {
  await assert.rejects(service({ insertError: { code: '42501' } }).saveDemoPayment(receipt), /could not be saved/);
  await assert.rejects(service({ insertError: { code: 'PGRST205' } }).saveDemoPayment(receipt), { code: 'DEMO_PAYMENT_STORAGE_UNAVAILABLE' });
  for (const changed of [{ user_id: 'another-user' }, { status: 'Paid' }, { amount: '750.00' }, { reference: 'DEMO-OTHER-123' }]) {
    await assert.rejects(service({ saved: { ...row, ...changed } }).saveDemoPayment(receipt), /verified|confirmed/);
  }
});

test('retrying a committed reference returns the same row without another transaction', async () => {
  const subject = service({ insertError: { code: '23505' } });
  assert.equal((await subject.saveDemoPayment(receipt)).id, row.id);
  assert.deepEqual(subject.requests[1].filters, [['user_id', ownerId], ['reference', receipt.reference]]);
  assert.equal(subject.requests.filter((request) => request.input).length, 1);
});

test('history reads the verified owner, pages all records and labels them Demo', async () => {
  const rows = Array.from({ length: 205 }, (_, index) => ({ ...row, id: `demo-${index}` }));
  const subject = service({ rows });
  const history = await subject.getDemoPaymentHistory('demo_fake', { isDemo: true });
  assert.equal(history.length, 205);
  assert.equal(history[0].status, 'Demo');
  assert.equal(history[0].amount, 450);
  assert.equal(history[0].reference, receipt.reference);
  assert.deepEqual(subject.requests[0].filters, [['user_id', ownerId]]);
  assert.deepEqual(subject.requests.map((request) => request.range), [[0, 199], [200, 399]]);
});

test('missing demo storage is compatible with existing real history; denied reads remain errors', async () => {
  assert.deepEqual(await service({ readError: { code: 'PGRST205' } }).getDemoPaymentHistory(ownerId), []);
  await assert.rejects(service({ readError: { code: '42501' } }).getDemoPaymentHistory(ownerId), { code: '42501' });
  await assert.rejects(service({ rows: [{ ...row, user_id: 'another-user' }] }).getDemoPaymentHistory(ownerId), /could not be verified/);
  const controller = new AbortController();
  controller.abort();
  const subject = service();
  await assert.rejects(subject.getDemoPaymentHistory(ownerId, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(subject.requests.length, 0);
});

const linkedReceipt = { ...receipt, cardId: 'card-1', bookerName: 'Booking Student', tutorId: 'tutor-42',
  booking: { year: 2026, month: 9, date: 8, slot: receipt.time, tutorName: receipt.tutorName,
    subject: receipt.subject, tutorId: 'tutor-42', bookerName: 'Booking Student',
    mode: 'online', groupSize: 'small', sessionFee: 400, platformFee: 50, total: 450, rescheduleId: null } };
const linkedPayment = { ...row, booking_id: 'booking-1', booker_name: 'Booking Student', tutor_id: 'tutor-42' };
const linkedBooking = { id: 'booking-1', student_id: ownerId, tutor_name: receipt.tutorName,
  subject: receipt.subject, total_fee: 450, slot: receipt.time, session_date: receipt.sessionDate,
  month: 10, status: 'Confirmed' };

test('new checkout records a linked booking and payment through one database transaction', async () => {
  const subject = service({ rpcData: { payment: linkedPayment, booking: linkedBooking } });
  const saved = await subject.saveDemoPayment(linkedReceipt);
  assert.equal(subject.requests.length, 1);
  assert.equal(subject.requests[0].rpc, 'record_booking_payment');
  assert.deepEqual(subject.requests[0].input, {
    p_reference: receipt.reference, p_card_id: 'card-1', p_booking: linkedReceipt.booking,
  });
  assert.equal(saved.booking.id, saved.booking_id);
  assert.equal(saved.booking.month, 9);
  assert.equal(saved.booker_name, 'Booking Student');
  assert.equal(saved.tutor_id, 'tutor-42');
});

test('unconfirmed, mismatched and failed linked records never open booking success', async () => {
  for (const change of [{ student_id: 'another-user' }, { id: 'wrong-booking' },
    { tutor_name: 'Wrong Tutor' }, { subject: 'Wrong subject' }, { total_fee: 999 }, { status: 'Cancelled' }]) {
    await assert.rejects(service({ rpcData: { payment: linkedPayment, booking: { ...linkedBooking, ...change } } })
      .saveDemoPayment(linkedReceipt), /confirmed together/);
  }
  await assert.rejects(service({ rpcError: { code: 'PGRST202' } }).saveDemoPayment(linkedReceipt), /supabase_booking_payments.sql/);
  await assert.rejects(service({ rpcError: { code: '42501' } }).saveDemoPayment(linkedReceipt), /could not be saved/);
});

test('history preserves tutor, booker, subject and booking snapshots from the saved record', async () => {
  const subject = service({ rows: [{ ...linkedPayment, counterparty_avatar_url: 'https://example.com/tutor.jpg' }] });
  const [payment] = await subject.getDemoPaymentHistory(ownerId);
  assert.equal(payment.name, receipt.tutorName);
  assert.equal(payment.subject, receipt.subject);
  assert.equal(payment.bookerName, 'Booking Student');
  assert.equal(payment.tutorId, 'tutor-42');
  assert.equal(payment.bookingId, 'booking-1');
  assert.equal(payment.avatarUrl, 'https://example.com/tutor.jpg');
});
