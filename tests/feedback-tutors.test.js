const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('@babel/core');

function services(respond) {
  const requests = [];
  const client = {
    from(table) {
      const request = { table, filters: [], order: [] };
      requests.push(request);
      const result = () => Promise.resolve(respond(request));
      const query = {
        select(columns) { request.columns = columns; return query; },
        eq(column, value) { request.filters.push([column, value]); return query; },
        order(column) { request.order.push(column); return query; },
        range(start, end) { request.range = [start, end]; return query; },
        abortSignal(signal) { request.signal = signal; return query; },
        upsert(record) { request.record = record; return query; },
        maybeSingle: result,
        single: result,
        then(resolve, reject) { return result().then(resolve, reject); },
      };
      return query;
    },
  };
  function load(name, dependencies) {
    const { code } = transformSync(fs.readFileSync(path.join(__dirname, `../src/services/${name}.js`), 'utf8'), {
      babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
    });
    const module = { exports: {} };
    new Function('require', 'module', 'exports', code)((dependency) => {
      if (dependencies[dependency]) return dependencies[dependency];
      throw new Error(`Unexpected dependency: ${dependency}`);
    }, module, module.exports);
    return module.exports;
  }
  const tutors = load('tutors', { '../utils/supabase': { supabase: client } });
  const feedback = load('feedback', {
    '../utils/supabase': { supabase: client },
    './tutors': tutors,
    './paymentIdentity': { getPaymentIdentity: async () => ({ client, userId: 'viewer' }) },
  });
  return { tutors, feedback, requests };
}

const tutor = {
  id: 't10', name: 'Saliya Dilshan', photoUrl: 'https://example.com/t10.jpg',
  university: 'SLIIT', verifiedStatus: 'verified',
  subjects: [{ subjectName: 'Programming' }, 'Mathematics'],
};

test('the feedback list reads all tutors pages including unverified tutors and preserves text IDs', async () => {
  const unverified = { id: 't2', name: 'Thisal Seniya', verifiedStatus: 'unverified' };
  const { tutors, requests } = services(request => ({
    data: request.range[0] === 0 ? [tutor, unverified] : [], error: null,
  }));
  const records = await tutors.fetchAllTutors();
  assert.deepEqual(records.map(record => record.id), ['t10', 't2']);
  assert.equal(records[0].fullName, tutor.name);
  assert.equal(records[0].avatarUrl, tutor.photoUrl);
  assert.equal(records[0].university, 'SLIIT');
  assert.deepEqual(records[0].subjects, ['Programming', 'Mathematics']);
  assert.deepEqual(records[1].subjects, []);
  assert.equal(records[1].verifiedStatus, 'unverified');
  assert.deepEqual(requests.map(request => request.range), [[0, 199], [2, 201]]);
  for (const request of requests) {
    assert.equal(request.table, 'tutors');
    assert.deepEqual(request.order, ['name', 'id']);
    assert.deepEqual(request.filters, []);
  }
});

test('View all resolves the same tutors record and photo using its text ID', async () => {
  const controller = new AbortController();
  const { feedback, requests } = services(() => ({ data: tutor, error: null }));
  const record = await feedback.fetchFeedbackTutor('t10', controller.signal);
  assert.equal(record.id, 't10');
  assert.equal(record.fullName, tutor.name);
  assert.equal(record.avatarUrl, tutor.photoUrl);
  assert.equal(requests[0].table, 'tutors');
  assert.deepEqual(requests[0].filters, [['id', 't10']]);
  assert.equal(requests[0].signal, controller.signal);
});

test('text tutor IDs scope feedback reads and rating writes without UUID conversion', async () => {
  const { feedback, requests } = services(request => ({ data: request.record || [], error: null }));
  const result = await feedback.loadTutorFeedback('t10', { id: 'viewer' });
  assert.deepEqual(result.ratings, []);
  assert.equal(requests.length, 3);
  for (const request of requests) assert.deepEqual(request.filters, [['tutor_id', 't10']]);
  await feedback.saveTutorRating('t10', { id: 'viewer' }, 4);
  assert.deepEqual(requests[3].record, { tutor_id: 't10', user_id: 'viewer', rating: 4 });
});

test('cancelled tutor loads do not send new requests', async () => {
  const controller = new AbortController();
  controller.abort();
  const { tutors, requests } = services(() => ({ data: [], error: null }));
  await assert.rejects(tutors.fetchAllTutors({ signal: controller.signal }), /cancelled/);
  assert.equal(requests.length, 0);
});

test('permission errors and missing tutors are surfaced', async () => {
  const denied = { code: '42501', message: 'Permission denied' };
  const failure = services(() => ({ data: null, error: denied }));
  await assert.rejects(failure.tutors.fetchAllTutors(), error => error === denied);
  await assert.rejects(failure.feedback.fetchFeedbackTutor('t10'), error => error === denied);
  const missing = services(() => ({ data: null, error: null }));
  await assert.rejects(missing.feedback.fetchFeedbackTutor('t10'), /unavailable/);
  await assert.rejects(missing.tutors.fetchAllTutors(), /Invalid tutor response/);
});

test('empty and malformed tutor IDs do not reach the database', async () => {
  const { feedback, requests } = services(() => ({ data: [], error: null }));
  for (const id of ['', ' ', ' t10 ', null, undefined, 10]) {
    await assert.rejects(feedback.fetchFeedbackTutor(id), /unavailable/);
    await assert.rejects(feedback.loadTutorFeedback(id, {}), /unavailable/);
  }
  assert.equal(requests.length, 0);
});
