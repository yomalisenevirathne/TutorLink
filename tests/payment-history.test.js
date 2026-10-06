const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('@babel/core');

function loadModule(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const { code } = transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const loaded = { exports: {} };
  const requireDependency = (name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  };
  new Function('require', 'module', 'exports', code)(requireDependency, loaded, loaded.exports);
  return loaded.exports;
}

const formatting = loadModule('src/data/paymentHistory.js');
const userId = '00000000-0000-0000-0000-000000000001';
const row = {
  id: 'payment-1', user_id: userId, counterparty_name: 'Test Tutor',
  counterparty_avatar_url: null, amount: '2500.00', currency: 'LKR',
  direction: 'Sent', status: 'Paid', occurred_at: '2026-09-13T16:30:00+05:30',
};

function paymentService({ rows = [row], error = null, authenticatedId = userId, authError = null } = {}) {
  const requests = [];
  const supabase = {
    auth: { getUser: async () => ({ data: { user: authenticatedId ? { id: authenticatedId } : null }, error: authError }) },
    from: (table) => {
      const request = { table, filters: [] };
      requests.push(request);
      const query = {
        select: () => query,
        eq: (column, value) => { request.filters.push([column, value]); return query; },
        order: () => query,
        range: (start, end) => { request.range = [start, end]; return query; },
        abortSignal: (signal) => { request.signal = signal; return query; },
        then: (resolve, reject) => Promise.resolve({
          data: error ? null : rows.slice(request.range[0], request.range[1] + 1), error,
        }).then(resolve, reject),
      };
      return query;
    },
  };
  return {
    ...loadModule('src/services/payments.js', {
      '../utils/supabase': { supabase }, '../data/paymentHistory': formatting,
    }),
    requests,
  };
}

test('loads authenticated payment rows and converts database amounts for the UI', async () => {
  const service = paymentService();
  const records = await service.getPaymentHistory(userId);
  assert.equal(records[0].amount, 2500);
  assert.equal(records[0].status, 'Paid');
  assert.equal(records[0].name, 'Test Tutor');
  assert.equal(formatting.formatPaymentAmount(records[0]), 'LKR 2,500.00');
  assert.equal(formatting.formatPaymentDate(records[0].occurredAt), '13.09.2026  4:30 PM');
  assert.deepEqual(service.requests[0].filters, [['user_id', userId]]);
});

test('an empty database result stays empty without dummy payments', async () => {
  assert.deepEqual(await paymentService({ rows: [] }).getPaymentHistory(userId), []);
});

test('refuses a missing or mismatched authenticated identity without querying payments', async () => {
  for (const authenticatedId of [null, 'different-user']) {
    const service = paymentService({ authenticatedId });
    await assert.rejects(service.getPaymentHistory(userId), { code: 'AUTH_REQUIRED' });
    assert.equal(service.requests.length, 0);
  }
});

test('never returns another user’s payment rows', async () => {
  const service = paymentService({ rows: [{ ...row, user_id: 'different-user' }] });
  await assert.rejects(service.getPaymentHistory(userId), /Invalid payment history owner/);
});

test('database and auth errors stay distinguishable from an empty history', async () => {
  const databaseError = Object.assign(new Error('Missing payments table'), { code: 'PGRST205' });
  await assert.rejects(paymentService({ error: databaseError }).getPaymentHistory(userId), { code: 'PGRST205' });
  const authError = Object.assign(new Error('Session missing'), { name: 'AuthSessionMissingError' });
  const service = paymentService({ authError });
  await assert.rejects(service.getPaymentHistory(userId), { name: 'AuthSessionMissingError' });
  assert.equal(service.requests.length, 0);
  assert.match(service.paymentHistoryErrorMessage(authError), /sign in again/);
});

test('loads records beyond the first response page', async () => {
  const rows = Array.from({ length: 205 }, (_, index) => ({ ...row, id: `payment-${index}` }));
  const service = paymentService({ rows });
  assert.equal((await service.getPaymentHistory(userId)).length, 205);
  assert.deepEqual(service.requests.map((request) => request.range), [[0, 199], [200, 399]]);
});

test('cancels abandoned requests without querying the database', async () => {
  const controller = new AbortController();
  controller.abort();
  const service = paymentService();
  await assert.rejects(service.getPaymentHistory(userId, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(service.requests.length, 0);
});

test('status filters and search use database records and preserve monthly groups', () => {
  const records = [
    formatting.mapPaymentRecord(row),
    formatting.mapPaymentRecord({ ...row, id: 'refund', status: 'Refunded', occurred_at: '2026-08-13T16:30:00+05:30' }),
  ];
  assert.deepEqual(formatting.getPaymentSections(records).map((section) => section.title), ['September - 2026', 'August - 2026']);
  assert.equal(formatting.getPaymentSections(records, 'test', 'Refunded')[0].data[0].id, 'refund');
  assert.equal(formatting.getPaymentSections(records, '', 'Pending').length, 0);
  assert.equal(formatting.getPaymentSections(records, 'missing').length, 0);
  assert.throws(() => formatting.mapPaymentRecord({ ...row, amount: 'invalid' }), /invalid record/);
});

test('successful login returns the Supabase UUID and never a mock token', async () => {
  const supabase = { auth: { signInWithPassword: async () => ({
    data: { user: { id: userId, email: 'test@example.com', user_metadata: { fullName: 'Test User', role: 'Tutor' } }, session: { access_token: 'real-session-token' } }, error: null,
  }) } };
  const { apiService } = loadModule('src/services/api.js', { '../utils/supabase': { supabase } });
  const result = await apiService.login('test@example.com', 'test-password');
  assert.equal(result.user.id, userId);
  assert.equal(result.user.role, 'Tutor');
  assert.equal(result.token, 'real-session-token');
  assert.equal('password' in result.user, false);
});

test('incorrect passwords enter a demo account and clear the previous local session', async () => {
  const signOutCalls = [];
  const failure = async () => ({ data: null, error: new Error('Invalid credentials') });
  const supabase = { auth: {
    signInWithPassword: failure,
    signOut: async (options) => { signOutCalls.push(options); return { error: null }; },
  } };
  const { apiService } = loadModule('src/services/api.js', { '../utils/supabase': { supabase } });
  const result = await apiService.login('test@example.com', 'wrong-password');
  assert.equal(result.success, true);
  assert.equal(result.user.isDemo, true);
  assert.match(result.user.id, /^demo_/);
  assert.equal(result.user.isEmailVerified, false);
  assert.equal(result.token, null);
  assert.equal('password' in result.user, false);
  assert.deepEqual(signOutCalls, [{ scope: 'local' }]);
  const service = paymentService();
  await assert.rejects(service.getPaymentHistory(result.user.id), { code: 'AUTH_REQUIRED' });
  assert.equal(service.requests.length, 0);
});

test('demo login still opens when Supabase is unreachable', async () => {
  const unavailable = async () => { throw new Error('Network unavailable'); };
  const supabase = { auth: { signInWithPassword: unavailable, signOut: unavailable } };
  const { apiService } = loadModule('src/services/api.js', { '../utils/supabase': { supabase } });
  const result = await apiService.login('tutor@example.com', 'any-password');
  assert.equal(result.success, true);
  assert.equal(result.user.role, 'Tutor');
  assert.equal(result.user.isDemo, true);
  assert.equal(result.token, null);
});

test('failed registrations do not create Supabase accounts through demo login', async () => {
  const supabase = { auth: { signUp: async () => ({ data: null, error: new Error('Registration failed') }) } };
  const { apiService } = loadModule('src/services/api.js', { '../utils/supabase': { supabase } });
  assert.equal((await apiService.register({ email: 'test@example.com', password: 'test-password' })).success, false);
});
