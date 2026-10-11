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
  dependencies = { 'react-native': { Platform: { OS: 'web' } }, ...dependencies };
  const requireDependency = (name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  };
  new Function('require', 'module', 'exports', 'fetch', code)(requireDependency, loaded, loaded.exports,
    async () => { throw new Error('Local API unavailable in isolated tests'); });
  return loaded.exports;
}

const formatting = loadModule('src/data/paymentHistory.js');
const userId = '00000000-0000-0000-0000-000000000001';
const row = {
  id: 'payment-1', user_id: userId, counterparty_name: 'Test Tutor',
  counterparty_avatar_url: null, amount: '2500.00', currency: 'LKR',
  direction: 'Sent', status: 'Paid', occurred_at: '2026-09-13T16:30:00+05:30',
};

function paymentService({ rows = [row], error = null, authenticatedId = userId, authError = null, demoRows = [] } = {}) {
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
      './demoPayments': { getDemoPaymentHistory: async () => demoRows },
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

test('combined history includes saved demos without treating them as Paid transactions', async () => {
  const demo = { id: 'demo:saved-1', name: 'Test Tutor', amount: 450, currency: 'LKR', status: 'Demo',
    occurredAt: '2026-10-08T10:00:00Z', direction: 'Sent', reference: 'DEMO-TEST-12345' };
  const subject = paymentService({ demoRows: [demo] });
  const history = await subject.getCombinedPaymentHistory(userId);
  assert.equal(history.length, 2);
  assert.equal(history[0].status, 'Demo');
  assert.equal(formatting.getPaymentSections(history, '', 'Paid')[0].data.length, 1);
  assert.equal(formatting.getPaymentSections(history, 'DEMO-TEST', 'Demo')[0].data[0].amount, 450);
  const anonymous = paymentService({ authenticatedId: null, demoRows: [demo] });
  assert.deepEqual(await anonymous.getCombinedPaymentHistory('demo_fake', { isDemo: true }), [demo]);
  assert.equal(anonymous.requests.length, 0);
});

test('login prefers the incoming branch database profile over conflicting auth metadata', async () => {
  const requests = [];
  const supabase = {
    auth: { signInWithPassword: async () => ({ data: {
      user: { id: userId, email: 'test@example.com', user_metadata: { fullName: 'Metadata Name', role: 'Student' } },
      session: { access_token: 'verified-session' },
    }, error: null }) },
    from(table) {
      const request = { table };
      requests.push(request);
      const query = {
        select: () => query,
        eq(column, value) { request.filter = [column, value]; return query; },
        single: async () => ({ data: table === 'profiles'
          ? { id: userId, role: 'Tutor', email: 'stored@example.com', full_name: 'Stored Tutor', phone_number: '0710000000', is_email_verified: true }
          : { subjects: ['Database Systems'], experience_level: 'Senior Tutor' }, error: null }),
      };
      return query;
    },
  };
  const { apiService } = loadModule('src/services/api.js', { '../utils/supabase': { supabase } });
  const result = await apiService.login('test@example.com', 'test-password');
  assert.equal(result.user.fullName, 'Stored Tutor');
  assert.equal(result.user.role, 'Tutor');
  assert.equal(result.user.email, 'stored@example.com');
  assert.deepEqual(result.user.subjects, ['Database Systems']);
  assert.equal(result.token, 'verified-session');
  assert.deepEqual(requests, [
    { table: 'profiles', filter: ['id', userId] },
    { table: 'tutor_profiles', filter: ['user_id', userId] },
  ]);
});

test('incoming registration persists the profile, role profile and supplied certificates', async () => {
  const requests = [];
  const supabase = {
    auth: { signUp: async () => ({ data: {
      user: { id: userId, email: 'test@example.com', user_metadata: { role: 'Tutor' } },
      session: { access_token: 'verified-session' },
    }, error: null }) },
    from(table) { return {
      upsert: async (data, options) => { requests.push({ table, data, options }); return { error: null }; },
      insert: async (data) => { requests.push({ table, data }); return { error: null }; },
    }; },
  };
  const { apiService } = loadModule('src/services/api.js', { '../utils/supabase': { supabase } });
  const result = await apiService.register({ email: 'test@example.com', password: 'test-password', role: 'Tutor', fullName: 'New Tutor',
    subjects: ['Mathematics'], certificates: [{ title: 'Degree', issuingInstitute: 'University', certificateUrl: 'https://example.com/degree.pdf' }] });
  assert.equal(result.success, true);
  assert.equal(result.user.id, userId);
  assert.equal('password' in result.user, false);
  assert.equal(result.token, 'verified-session');
  assert.deepEqual(requests.map((request) => request.table), ['profiles', 'tutor_profiles', 'tutor_certificates']);
  assert.equal(requests[0].data.full_name, 'New Tutor');
  assert.equal(requests[1].data.user_id, userId);
  assert.equal(requests[2].data[0].tutor_id, userId);
});

test('failed incoming profile persistence does not report registration success', async () => {
  const requests = [];
  const supabase = {
    auth: { signUp: async () => ({ data: { user: { id: userId, email: 'test@example.com' } }, error: null }) },
    from(table) { requests.push(table); return { upsert: async () => ({ error: { message: 'Denied profile write' } }) }; },
  };
  const { apiService } = loadModule('src/services/api.js', { '../utils/supabase': { supabase } });
  const result = await apiService.register({ email: 'test@example.com', password: 'test-password', role: 'Student', fullName: 'New Student' });
  assert.equal(result.success, false);
  assert.match(result.message, /Profile could not be saved/);
  assert.deepEqual(requests, ['profiles']);
});
