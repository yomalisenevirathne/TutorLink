const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('@babel/core');

function summaryService(respond) {
  const requests = [];
  const supabase = {
    from(table) {
      const request = { table };
      requests.push(request);
      const query = {
        select(columns) { request.columns = columns; return query; },
        eq(column, value) { request.filter = [column, value]; return query; },
        in(column, values) { request.filter = [column, values]; return query; },
        order(column) { request.order = column; return query; },
        range(start, end) { request.range = [start, end]; return query; },
        abortSignal(signal) { request.signal = signal; return query; },
        then(resolve, reject) { return Promise.resolve(respond(request)).then(resolve, reject); },
      };
      return query;
    },
  };
  function load(relativePath, dependencies = {}) {
    const { code } = transformSync(fs.readFileSync(path.join(__dirname, '../src', relativePath), 'utf8'), {
      babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
    });
    const module = { exports: {} };
    new Function('require', 'module', 'exports', code)((name) => {
      if (dependencies[name]) return dependencies[name];
      throw new Error(`Unexpected dependency: ${name}`);
    }, module, module.exports);
    return module.exports;
  }
  const api = load('services/tutorRatingSummary.js', {
    '../utils/supabase': { supabase }, '../data/feedback': load('data/feedback.js'),
  });
  return { api, requests };
}

test('profile statistic aggregates every page for the selected tutor without writing discovery data', async () => {
  const ratings = Array.from({ length: 205 }, (_, i) => ({
    tutor_id: 't8', user_id: `user-${i}`, rating: i < 200 ? 5 : 1,
  }));
  const { api, requests } = summaryService(request => ({
    data: ratings.slice(request.range[0], request.range[1] + 1), error: null,
  }));
  const signal = new AbortController().signal;
  const summary = await api.fetchTutorRatingSummary('t8', signal);
  assert.equal(summary.total, 205);
  assert.equal(summary.average, 1005 / 205);
  assert.deepEqual(summary.distribution, { 1: 5, 2: 0, 3: 0, 4: 0, 5: 200 });
  assert.deepEqual(requests.map(request => request.range), [[0, 199], [200, 399], [205, 404]]);
  for (const request of requests) {
    assert.equal(request.table, 'tutor_ratings');
    assert.deepEqual(request.filter, ['tutor_id', 't8']);
    assert.equal(request.signal, signal);
  }
});

test('no submitted ratings gives a genuine zero count', async () => {
  const { api } = summaryService(() => ({ data: [], error: null }));
  const summary = await api.fetchTutorRatingSummary('t8');
  assert.equal(summary.total, 0);
  assert.equal(summary.average, 0);
});

test('database errors remain errors instead of displaying a zero or a stored discovery average', async () => {
  const denied = { code: '42501', message: 'Permission denied' };
  const { api } = summaryService(() => ({ data: null, error: denied }));
  await assert.rejects(api.fetchTutorRatingSummary('t8'), error => error === denied);
});

test('malformed responses and another tutors ratings cannot be displayed as this tutors feedback', async () => {
  for (const data of [null, [{ tutor_id: 't9', user_id: 'viewer', rating: 5 }]]) {
    const { api } = summaryService(() => ({ data, error: null }));
    await assert.rejects(api.fetchTutorRatingSummary('t8'), /Invalid tutor rating response/);
  }
});

test('cancelled requests and missing tutor IDs never query the database', async () => {
  const { api, requests } = summaryService(() => ({ data: [], error: null }));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(api.fetchTutorRatingSummary('t8', controller.signal), /cancelled/);
  for (const id of ['', ' ', ' t8 ', null, 8]) {
    await assert.rejects(api.fetchTutorRatingSummary(id), /unavailable/);
  }
  assert.equal(requests.length, 0);
});

test('card summaries group each tutors ratings and include unrated tutors with no discovery fallback', async () => {
  const ratings = [
    { tutor_id: 't8', user_id: 'u1', rating: 5 },
    { tutor_id: 't8', user_id: 'u2', rating: 3 },
    { tutor_id: 't9', user_id: 'u1', rating: 1 },
  ];
  // Simulate a response limit lower than the requested page size.
  const { api, requests } = summaryService(request => ({
    data: ratings.slice(request.range[0], request.range[0] + 2), error: null,
  }));
  const summaries = await api.fetchTutorRatingSummaries(['t8', 't9', 't2', 't8']);
  assert.equal(summaries.size, 3);
  assert.equal(summaries.get('t8').average, 4);
  assert.equal(summaries.get('t8').total, 2);
  assert.equal(summaries.get('t9').average, 1);
  assert.equal(summaries.get('t9').total, 1);
  assert.equal(summaries.get('t2').average, 0);
  assert.equal(summaries.get('t2').total, 0);
  assert.deepEqual(requests.map(request => request.range[0]), [0, 2, 3]);
  for (const request of requests) {
    assert.equal(request.table, 'tutor_ratings');
    assert.deepEqual(request.filter, ['tutor_id', ['t8', 't9', 't2']]);
  }
});

test('long tutor lists use bounded ID batches rather than one request for each tutor', async () => {
  const { api, requests } = summaryService(() => ({ data: [], error: null }));
  const ids = Array.from({ length: 51 }, (_, i) => `t${i}`);
  const summaries = await api.fetchTutorRatingSummaries(ids);
  assert.equal(summaries.size, 51);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].filter[1].length, 50);
  assert.deepEqual(requests[1].filter[1], ['t50']);
});

test('batch summary errors and unexpected tutor IDs cannot become successful zero ratings', async () => {
  const denied = { code: '42501', message: 'Permission denied' };
  const failed = summaryService(() => ({ data: null, error: denied }));
  await assert.rejects(failed.api.fetchTutorRatingSummaries(['t8']), error => error === denied);
  const invalid = summaryService(() => ({
    data: [{ tutor_id: 't9', user_id: 'viewer', rating: 5 }], error: null,
  }));
  await assert.rejects(invalid.api.fetchTutorRatingSummaries(['t8']), /Invalid tutor rating response/);
});

test('empty lists, cancelled batches, and invalid tutor IDs avoid database requests', async () => {
  const { api, requests } = summaryService(() => ({ data: [], error: null }));
  assert.equal((await api.fetchTutorRatingSummaries([])).size, 0);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(api.fetchTutorRatingSummaries(['t8'], controller.signal), /cancelled/);
  await assert.rejects(api.fetchTutorRatingSummaries(['t8', '']), /unavailable/);
  assert.equal(requests.length, 0);
});
