const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('@babel/core');

function loadModule(relativePath, dependencies = {}) {
  const { code } = transformSync(fs.readFileSync(path.join(__dirname, '../src', relativePath), 'utf8'), {
    babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`);
    return dependencies[name];
  }, loaded, loaded.exports);
  return loaded.exports;
}

const amounts = loadModule('data/paymentHistory.js');
const receiptData = loadModule('data/paymentReceipt.js', { './paymentHistory': amounts });
const booking = { total: 750, year: 2026, month: 9, date: 8, slot: '6:00 PM', tutorName: 'Sarith Samarakoon', subject: 'Data Structures & Algorithms' };
const card = { id: 'card-1', brand: 'Visa', last4: '1111' };
const now = new Date('2026-10-08T10:00:00Z');

test('demo receipts snapshot booking and masked card data and cannot imply a real transaction', () => {
  const original = { ...booking };
  const receipt = receiptData.createDemoPaymentReceipt(original, { ...card, number: '4111111111111111', cvv: '123' }, 'owner-1', now);
  original.total = 2500;
  assert.equal(receipt.amount, 750);
  assert.equal(receipt.date, 'Oct 8, 2026');
  assert.equal(receipt.isDemo, true);
  assert.match(receipt.reference, /^DEMO-/);
  assert.equal(receipt.number, undefined);
  assert.equal(receipt.cvv, undefined);
  const text = receiptData.receiptShareText(receipt);
  assert.match(text, /LKR 750\.00/);
  assert.match(text, /Visa ••• 1111/);
  assert.match(text, /No money was charged and no booking was created/);
  assert.equal(text.includes('owner-1'), false);
  assert.equal(text.includes('4111111111111111'), false);
});

test('receipts require a valid booking, owner and selected saved card', () => {
  for (const bad of [{ total: 0 }, { total: NaN }, { date: 32 }, { month: -1 }, { slot: '' }, { tutorName: '' }]) {
    assert.throws(() => receiptData.createDemoPaymentReceipt({ ...booking, ...bad }, card, 'owner-1'));
  }
  assert.throws(() => receiptData.createDemoPaymentReceipt(booking, null, 'owner-1'));
  assert.throws(() => receiptData.createDemoPaymentReceipt(booking, { ...card, last4: '4111111111111111' }, 'owner-1'));
  assert.throws(() => receiptData.createDemoPaymentReceipt(booking, card, ''));
});

test('receipt PDF HTML escapes tutor and subject content and includes the demo disclosure', () => {
  const receipt = receiptData.createDemoPaymentReceipt({
    ...booking, tutorName: '<script>alert(1)</script>', subject: 'Data & "Algorithms"',
  }, card, 'owner-1');
  const html = receiptData.receiptHtml(receipt);
  assert.equal(html.includes('<script>'), false);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Data &amp; &quot;Algorithms&quot;/);
  assert.match(html, /not proof of payment/);
});

test('native PDF export generates the receipt and shares only the resulting PDF file', async () => {
  const calls = [];
  const actions = loadModule('services/paymentReceiptActions.js', {
    'react-native': { Platform: { OS: 'android' }, Share: { share: async () => {} } },
    'expo-print': { printToFileAsync: async ({ html }) => { calls.push(['print', html]); return { uri: 'file:///demo-receipt.pdf' }; } },
    'expo-sharing': { isAvailableAsync: async () => true, shareAsync: async (uri, options) => { calls.push(['share', uri, options]); } },
    '../data/paymentReceipt': receiptData,
  });
  const receipt = receiptData.createDemoPaymentReceipt(booking, card, 'owner-1');
  assert.equal(await actions.downloadPaymentReceipt(receipt), 'file');
  assert.match(calls[0][1], /Demo Payment Confirmed/);
  assert.equal(calls[1][1], 'file:///demo-receipt.pdf');
  assert.equal(calls[1][2].mimeType, 'application/pdf');
});
