const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('@babel/core');

const { code } = transformSync(fs.readFileSync(path.join(__dirname, '../src/data/cardForm.js'), 'utf8'), {
  babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
});
const loaded = { exports: {} };
new Function('module', 'exports', code)(loaded, loaded.exports);
const { getCardMetadata, formatCardNumber, formatCardExpiry } = loaded.exports;
const now = new Date(2026, 9, 8);
const form = { number: '4111 1111 1111 1111', expiry: '12 / 30', cvv: '123', name: 'Test Student', saveForFuture: true };

test('supported brands validate while full numbers and CVV are excluded from metadata', () => {
  for (const [number, cvv, brand, last4] of [
    ['4111111111111111', '123', 'Visa', '1111'],
    ['5555555555554444', '123', 'Mastercard', '4444'],
    ['378282246310005', '1234', 'American Express', '0005'],
  ]) {
    assert.deepEqual(getCardMetadata({ ...form, number, cvv }, now), {
      brand, last4, exp_month: 12, exp_year: 2030, cardholder_name: 'Test Student',
    });
  }
});

test('expired dates, incorrect checksum, invalid security codes and missing consent are rejected', () => {
  for (const bad of [
    { expiry: '09 / 26' }, { expiry: '13 / 30' }, { number: '4111111111111112' },
    { cvv: '12' }, { name: '' }, { saveForFuture: false },
  ]) assert.throws(() => getCardMetadata({ ...form, ...bad }, now));
  assert.equal(getCardMetadata({ ...form, expiry: '10 / 26' }, now).exp_month, 10);
});

test('formatting keeps card and expiry fields bounded', () => {
  assert.equal(formatCardNumber('4111111111111111'), '4111 1111 1111 1111');
  assert.equal(formatCardExpiry('1230'), '12 / 30');
  assert.equal(formatCardExpiry('12301234'), '12 / 30');
});
