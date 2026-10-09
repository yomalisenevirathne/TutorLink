const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('@babel/core');

const tutorId = '00000000-0000-0000-0000-000000000001';
const userId = '00000000-0000-0000-0000-000000000011';
const commentId = '00000000-0000-0000-0000-000000000021';
const otherId = '00000000-0000-0000-0000-000000000099';
const user = { id: userId };
const saved = { id: commentId, tutor_id: tutorId, user_id: userId, body: 'Updated comment' };

function service({ record = saved, error = null, identityError = null } = {}) {
  const requests = [];
  let identityChecks = 0;
  const client = {
    from(table) {
      const request = { table, filters: [] };
      requests.push(request);
      const query = {
        update(value) { request.update = value; return query; },
        delete() { request.delete = true; return query; },
        eq(column, value) { request.filters.push([column, value]); return query; },
        select(columns) { request.columns = columns; return query; },
        single() { return Promise.resolve({ data: record, error }); },
        maybeSingle() { return Promise.resolve({ data: record, error }); },
      };
      return query;
    },
  };
  const { code } = transformSync(fs.readFileSync(path.join(__dirname, '../src/services/feedback.js'), 'utf8'), {
    babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => {
    if (name === '../utils/supabase') return { supabase: client };
    if (name === './paymentIdentity') return { getPaymentIdentity: async () => {
      identityChecks++;
      if (identityError) throw identityError;
      return { client, userId };
    } };
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  return { api: module.exports, requests, identityChecks: () => identityChecks };
}

test('editing changes only comment text and scopes the write to the verified owner and selected tutor', async () => {
  const { api, requests } = service();
  // A supplied UI ID never replaces the identity returned by authentication.
  await api.editTutorComment(tutorId, { id: otherId }, commentId, '  Updated comment  ');
  assert.deepEqual(requests[0].update, { body: 'Updated comment' });
  assert.equal(requests[0].table, 'tutor_comments');
  assert.deepEqual(requests[0].filters, [['id', commentId], ['tutor_id', tutorId], ['user_id', userId]]);
});

test('deletion targets one comment under the verified owner and tutor', async () => {
  const { api, requests } = service();
  await api.deleteTutorComment(tutorId, user, commentId);
  assert.equal(requests[0].delete, true);
  assert.deepEqual(requests[0].filters, [['id', commentId], ['tutor_id', tutorId], ['user_id', userId]]);
});

test('blank, oversized, and invalid-ID edits never reach authentication or the database', async () => {
  const { api, requests, identityChecks } = service();
  for (const text of ['', '   ', 'x'.repeat(1001)]) {
    await assert.rejects(api.editTutorComment(tutorId, user, commentId, text));
  }
  await assert.rejects(api.editTutorComment(tutorId, user, 'invalid', 'Valid text'));
  await assert.rejects(api.deleteTutorComment('invalid', user, commentId));
  await assert.rejects(api.deleteTutorComment(tutorId, user, 'invalid'));
  assert.equal(identityChecks(), 0);
  assert.equal(requests.length, 0);
});

test('failed authentication prevents comment mutations', async () => {
  const denied = Object.assign(new Error('Sign in required'), { code: 'AUTH_REQUIRED' });
  const { api, requests } = service({ identityError: denied });
  await assert.rejects(api.editTutorComment(tutorId, user, commentId, 'Updated comment'), denied);
  await assert.rejects(api.deleteTutorComment(tutorId, user, commentId), denied);
  assert.equal(requests.length, 0);
});

test('permission errors are surfaced instead of treating edits or deletions as successful', async () => {
  const denied = { code: '42501', message: 'Permission denied' };
  const { api } = service({ error: denied, record: null });
  await assert.rejects(api.editTutorComment(tutorId, user, commentId, 'Updated comment'), error => error === denied);
  await assert.rejects(api.deleteTutorComment(tutorId, user, commentId), error => error === denied);
});

test('missing and mismatched database acknowledgements cannot confirm a comment mutation', async () => {
  for (const record of [null, { ...saved, id: otherId }, { ...saved, tutor_id: otherId }, { ...saved, user_id: otherId }]) {
    const { api } = service({ record });
    await assert.rejects(api.editTutorComment(tutorId, user, commentId, 'Updated comment'), /confirmed/);
    await assert.rejects(api.deleteTutorComment(tutorId, user, commentId), /confirmed/);
  }
  const { api } = service({ record: { ...saved, body: 'Unchanged text' } });
  await assert.rejects(api.editTutorComment(tutorId, user, commentId, 'Updated comment'), /confirmed/);
});
