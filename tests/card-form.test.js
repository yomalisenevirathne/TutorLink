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

test('any 16 digits are accepted with the selected brand and only masked metadata is returned', () => {
  for (const [number, cvv, brand, last4] of [
    ['4111111111111111', '123', 'Visa', '1111'],
    ['5555555555554444', '123', 'Mastercard', '4444'],
    ['1234567890123456', '1234', 'American Express', '3456'],
    ['4111111111111112', '123', 'Visa', '1112'],
    ['0000000000000000', '123', 'Mastercard', '0000'],
  ]) {
    assert.deepEqual(getCardMetadata({ ...form, number, cvv, brand }, now), {
      brand, last4, exp_month: 12, exp_year: 2030, cardholder_name: 'Test Student',
    });
  }
});

test('expired dates, invalid security codes and missing consent are rejected', () => {
  for (const bad of [
    { expiry: '09 / 26' }, { expiry: '13 / 30' },
    { cvv: '12' }, { name: '' }, { saveForFuture: false },
  ]) assert.throws(() => getCardMetadata({ ...form, ...bad }, now));
  assert.equal(getCardMetadata({ ...form, expiry: '10 / 26' }, now).exp_month, 10);
});

test('card numbers must contain exactly 16 digits after removing spaces and hyphens', () => {
  for (const number of ['', '4111111111111', '378282246310005', '41111111111111111', '4111111111111111111', '123456789012345a']) {
    assert.throws(() => getCardMetadata({ ...form, number }, now), /exactly 16 digits/);
  }
  assert.equal(getCardMetadata({ ...form, number: '1234-5678-9012-3456' }, now).last4, '3456');
});

test('a card expires after the last day of its expiry month, including year rollover', () => {
  assert.doesNotThrow(() => getCardMetadata({ ...form, expiry: '10 / 26' }, new Date(2026, 9, 31, 23, 59, 59)));
  assert.throws(() => getCardMetadata({ ...form, expiry: '10 / 26' }, new Date(2026, 10, 1)), /expired/);
  assert.doesNotThrow(() => getCardMetadata({ ...form, expiry: '12 / 26' }, new Date(2026, 11, 31)));
  assert.throws(() => getCardMetadata({ ...form, expiry: '12 / 26' }, new Date(2027, 0, 1)), /expired/);
});

test('formatting keeps card and expiry fields bounded', () => {
  assert.equal(formatCardNumber('4111111111111111'), '4111 1111 1111 1111');
  assert.equal(formatCardNumber('12345678901234567890123'), '1234 5678 9012 3456');
  assert.equal(formatCardExpiry('1230'), '12 / 30');
  assert.equal(formatCardExpiry('12301234'), '12 / 30');
});
