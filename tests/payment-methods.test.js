const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('@babel/core');

const userId = '00000000-0000-0000-0000-000000000001';
const row = { id: 'saved-card-1', user_id: userId, brand: 'Visa', last4: '1042', exp_month: 4, exp_year: 2029, is_default: true };

function cardService({ rows = [row], error = null, authId = userId } = {}) {
  const requests = [];
  const supabase = {
    auth: { getUser: async () => ({ data: { user: authId ? { id: authId } : null }, error: null }) },
    from(table) {
      const request = { table, filters: [] };
      requests.push(request);
      const query = {
        select(columns) { request.columns = columns; return query; },
        eq(column, value) { request.filters.push([column, value]); return query; },
        order() { return query; },
        abortSignal() { return query; },
        then(resolve, reject) { return Promise.resolve({ data: rows, error }).then(resolve, reject); },
      };
      return query;
    },
  };
  const { code } = transformSync(fs.readFileSync(path.join(__dirname, '../src/services/paymentMethods.js'), 'utf8'), {
    babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', code)(() => ({ supabase }), loaded, loaded.exports);
  return { ...loaded.exports, requests };
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
