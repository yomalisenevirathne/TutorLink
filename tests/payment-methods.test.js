const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('@babel/core');

const userId = '00000000-0000-0000-0000-000000000001';
const row = { id: 'saved-card-1', user_id: userId, brand: 'Visa', last4: '1042', exp_month: 4, exp_year: 2029, is_default: true };

function loadService(filename, dependencies) {
  const { code } = transformSync(fs.readFileSync(path.join(__dirname, '../src/services', filename), 'utf8'), {
    babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`);
    return dependencies[name];
  }, loaded, loaded.exports);
  return loaded.exports;
}

function cardService({ rows = [row], error = null, authId = userId, insertResult,
  demoUser = null, signInError = null, demoAuthError = null } = {}) {
  const requests = [];
  const stats = { anonymousSignIns: 0, registeredAuthChecks: 0 };
  let anonymousUser = demoUser;
  const supabase = {
    auth: { getUser: async () => {
      stats.registeredAuthChecks++;
      return { data: { user: authId ? { id: authId } : null }, error: null };
    } },
    from(table) {
      const request = { table, filters: [] };
      requests.push(request);
      const query = {
        select(columns) { request.columns = columns; return query; },
        insert(value) { request.insert = value; return query; },
        single() { return Promise.resolve({ data: error ? null : insertResult || { ...request.insert, id: 'persisted-card', is_default: false }, error }); },
        eq(column, value) { request.filters.push([column, value]); return query; },
        order() { return query; },
        abortSignal() { return query; },
        then(resolve, reject) { return Promise.resolve({ data: rows, error }).then(resolve, reject); },
      };
      return query;
    },
  };
  const demoClient = {
    from: supabase.from,
    auth: {
      getSession: async () => ({ data: { session: anonymousUser ? { user: anonymousUser } : null }, error: null }),
      getUser: async () => ({ data: { user: anonymousUser }, error: demoAuthError }),
      signInAnonymously: async () => {
        stats.anonymousSignIns++;
        if (signInError) return { data: null, error: signInError };
        anonymousUser = { id: userId, is_anonymous: true };
        return { data: { user: anonymousUser, session: { access_token: 'verified-demo-session' } }, error: null };
      },
    },
  };
  const identity = loadService('paymentIdentity.js', {
    '../utils/supabase': { supabase },
    '../utils/paymentDemoClient': { getPaymentDemoClient: () => demoClient },
  });
  const methods = loadService('paymentMethods.js', { './paymentIdentity': identity });
  return { ...methods, ...identity, requests, stats };
}

test('saved cards are read for the authenticated owner and return only display metadata', async () => {
  const service = cardService();
  assert.deepEqual(await service.getSavedPaymentMethods(userId), [{ id: 'saved-card-1', brand: 'Visa', last4: '1042', expiry: '04/29' }]);
  assert.deepEqual(service.requests[0].filters, [['user_id', userId]]);
  assert.equal(service.requests[0].table, 'payment_methods');
  assert.equal(service.requests[0].columns, 'id, user_id, brand, last4, exp_month, exp_year, is_default');
});

test('an empty or missing saved-card table never produces a placeholder card', async () => {
  assert.deepEqual(await cardService({ rows: [] }).getSavedPaymentMethods(userId), []);
  for (const code of ['PGRST205', '42P01'])
    assert.deepEqual(await cardService({ error: { code } }).getSavedPaymentMethods(userId), []);
});

test('a missing or mismatched login cannot query another user’s cards', async () => {
  for (const authId of [null, 'different-user']) {
    const service = cardService({ authId });
    await assert.rejects(service.getSavedPaymentMethods(userId), { code: 'AUTH_REQUIRED' });
    assert.equal(service.requests.length, 0);
  }
  await assert.rejects(cardService({ rows: [{ ...row, user_id: 'different-user' }] }).getSavedPaymentMethods(userId), /Invalid saved card/);
});

test('database permission errors and invalid card metadata do not masquerade as no cards', async () => {
  await assert.rejects(cardService({ error: { code: '42501' } }).getSavedPaymentMethods(userId), { code: '42501' });
  for (const bad of [{ last4: '1234567890123456' }, { exp_month: 13 }, { brand: '' }])
    await assert.rejects(cardService({ rows: [{ ...row, ...bad }] }).getSavedPaymentMethods(userId), /Invalid saved card/);
});

test('abandoned saved-card requests do not query the database', async () => {
  const service = cardService();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(service.getSavedPaymentMethods(userId, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(service.requests.length, 0);
});

const metadata = { brand: 'Visa', last4: '1111', exp_month: 12, exp_year: 2030, cardholder_name: 'Test Student' };

test('saving inserts only masked fields with the verified owner and confirms the persisted row', async () => {
  const service = cardService();
  const saved = await service.savePaymentMethod(userId, {
    ...metadata, user_id: 'another-user', number: '4111111111111111', cvv: '123', token: 'untrusted-token',
  });
  assert.equal(saved.id, 'persisted-card');
  assert.deepEqual(service.requests[0].insert, { user_id: userId, ...metadata });
  assert.equal(saved.expiry, '12/30');
});

test('saving cannot write without a real matching authenticated identity', async () => {
  for (const authId of [null, 'another-user']) {
    const service = cardService({ authId });
    await assert.rejects(service.savePaymentMethod(userId, metadata), { code: 'AUTH_REQUIRED' });
    assert.equal(service.requests.length, 0);
  }
});

test('a rejected insert or unconfirmed database response never reports a saved card', async () => {
  await assert.rejects(cardService({ error: { code: '42501' } }).savePaymentMethod(userId, metadata), /couldn't save/);
  await assert.rejects(cardService({ error: { code: 'PGRST205' } }).savePaymentMethod(userId, metadata), { code: 'CARD_STORAGE_UNAVAILABLE' });
  await assert.rejects(cardService({ insertResult: { ...row, user_id: 'another-user' } }).savePaymentMethod(userId, metadata), /could not be confirmed/);
});

test('a demo with no session shows no cards and creates no authentication user on read', async () => {
  const service = cardService({ authId: null });
  assert.deepEqual(await service.getSavedPaymentMethods('demo_fake-id', { isDemo: true }), []);
  assert.equal(service.requests.length, 0);
  assert.equal(service.stats.anonymousSignIns, 0);
  assert.equal(service.stats.registeredAuthChecks, 0);
});

test('dummy login saves under a verified anonymous UUID and reads it after the dummy ID changes', async () => {
  const service = cardService({ authId: null });
  const saved = await service.savePaymentMethod('demo_fake-id', metadata, { isDemo: true });
  assert.equal(saved.id, 'persisted-card');
  assert.deepEqual(service.requests[0].insert, { user_id: userId, ...metadata });
  assert.deepEqual(await service.getSavedPaymentMethods('demo_new-login-id', { isDemo: true }), [
    { id: row.id, brand: 'Visa', last4: row.last4, expiry: '04/29' },
  ]);
  assert.deepEqual(service.requests[1].filters, [['user_id', userId]]);
  assert.equal(service.stats.anonymousSignIns, 1);
  assert.equal(service.stats.registeredAuthChecks, 0);
});

test('a restored anonymous session is reused and concurrent saves create only one demo identity', async () => {
  const restored = cardService({ demoUser: { id: userId, is_anonymous: true } });
  await restored.savePaymentMethod('demo_fake-id', metadata, { isDemo: true });
  assert.equal(restored.stats.anonymousSignIns, 0);
  const fresh = cardService();
  await Promise.all([
    fresh.getPaymentIdentity('demo_one', { isDemo: true, create: true }),
    fresh.getPaymentIdentity('demo_two', { isDemo: true, create: true }),
  ]);
  assert.equal(fresh.stats.anonymousSignIns, 1);
});

test('disabled anonymous authentication blocks inserts with a specific setup error and can retry', async () => {
  const service = cardService({ signInError: { code: 'anonymous_provider_disabled' } });
  for (let attempt = 0; attempt < 2; attempt++) {
    await assert.rejects(service.savePaymentMethod('demo_fake-id', metadata, { isDemo: true }), {
      code: 'DEMO_AUTH_DISABLED',
    });
  }
  assert.equal(service.stats.anonymousSignIns, 2);
  assert.equal(service.requests.length, 0);
});

test('unverified or non-anonymous demo sessions and another owner cannot supply saved cards', async () => {
  for (const options of [
    { demoUser: { id: userId, is_anonymous: false } },
    { demoUser: { id: 'demo_fake-id', is_anonymous: true } },
    { demoUser: { id: userId, is_anonymous: true }, demoAuthError: { status: 401 } },
  ]) {
    const service = cardService(options);
    await assert.rejects(service.savePaymentMethod('demo_fake-id', metadata, { isDemo: true }), {
      code: 'DEMO_AUTH_UNAVAILABLE',
    });
    assert.equal(service.requests.length, 0);
  }
  const service = cardService({ demoUser: { id: userId, is_anonymous: true }, rows: [{ ...row, user_id: 'another-user' }] });
  await assert.rejects(service.getSavedPaymentMethods('demo_fake-id', { isDemo: true }), /Invalid saved card/);
});

test('invalid card metadata cannot create an anonymous user', async () => {
  const service = cardService();
  await assert.rejects(service.savePaymentMethod('demo_fake-id', { ...metadata, last4: 'full-card-number' }, { isDemo: true }), /Check the card details/);
  assert.equal(service.stats.anonymousSignIns, 0);
  assert.equal(service.requests.length, 0);
});
