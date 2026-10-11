const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('@babel/core');

function reviewService(respond) {
  const requests = [];
  const supabase = {
    from(table) {
      const request = { table, filters: [], order: [] };
      requests.push(request);
      const query = {
        select(columns) { request.columns = columns; return query; },
        eq(column, value) { request.filters.push([column, value]); return query; },
        is(column, value) { request.filters.push([column, value]); return query; },
        in(column, values) { request.filters.push([column, values]); return query; },
        order(column, options) { request.order.push([column, options]); return query; },
        limit(value) { request.limit = value; return query; },
        abortSignal(signal) { request.signal = signal; return query; },
        then(resolve, reject) { return Promise.resolve(respond(request)).then(resolve, reject); },
      };
      return query;
    },
  };
  const { code } = transformSync(fs.readFileSync(path.join(__dirname, '../src/services/tutorProfileReviews.js'), 'utf8'), {
    babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    assert.equal(name, '../utils/supabase');
    return { supabase };
  }, module, module.exports);
  return { api: module.exports, requests };
}

const comments = [
  { id: 'c2', tutor_id: 't8', user_id: 'u2', author_name: 'Learner Two', body: 'Clear explanations.', parent_id: null },
  { id: 'c1', tutor_id: 't8', user_id: 'u1', author_name: 'Learner One', body: 'Helpful session.', parent_id: null },
];

test('profile reviews use this tutors latest top-level comments and match ratings by author', async () => {
  const { api, requests } = reviewService(request => ({ data: request.table === 'tutor_comments' ? comments : [
    { tutor_id: 't8', user_id: 'u1', rating: 4 },
    { tutor_id: 't8', user_id: 'u2', rating: 5 },
  ], error: null }));
  const signal = new AbortController().signal;
  assert.deepEqual(await api.fetchTutorProfileReviews('t8', signal), [
    { id: 'c2', text: 'Clear explanations.', authorName: 'Learner Two', rating: 5 },
    { id: 'c1', text: 'Helpful session.', authorName: 'Learner One', rating: 4 },
  ]);
  assert.deepEqual(requests[0].filters, [['tutor_id', 't8'], ['parent_id', null]]);
  assert.deepEqual(requests[0].order, [['created_at', { ascending: false }], ['id', { ascending: false }]]);
  assert.equal(requests[0].limit, 5);
  assert.equal(requests[1].table, 'tutor_ratings');
  assert.deepEqual(requests[1].filters, [['tutor_id', 't8'], ['user_id', ['u2', 'u1']]]);
  for (const request of requests) assert.equal(request.signal, signal);
});

test('an empty comment table does not show discovery sample reviews or query ratings', async () => {
  const { api, requests } = reviewService(() => ({ data: [], error: null }));
  assert.deepEqual(await api.fetchTutorProfileReviews('t8'), []);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].table, 'tutor_comments');
});

test('missing or invalid personal ratings do not invent a score for a genuine comment', async () => {
  const { api } = reviewService(request => ({
    data: request.table === 'tutor_comments' ? comments : [{ tutor_id: 't8', user_id: 'u1', rating: 9 }],
    error: null,
  }));
  const reviews = await api.fetchTutorProfileReviews('t8');
  assert.deepEqual(reviews.map(review => review.rating), [null, null]);
  assert.deepEqual(reviews.map(review => review.text), comments.map(comment => comment.body));
});

test('failed reads remain errors instead of being treated as no reviews', async () => {
  const denied = { code: '42501', message: 'Permission denied' };
  for (const failingTable of ['tutor_comments', 'tutor_ratings']) {
    const { api } = reviewService(request => request.table === failingTable
      ? { data: null, error: denied } : { data: comments, error: null });
    await assert.rejects(api.fetchTutorProfileReviews('t8'), error => error === denied);
  }
});

test('another tutors comments, replies, or unrelated author ratings cannot appear in the review preview', async () => {
  for (const data of [null, [{ ...comments[0], tutor_id: 't9' }], [{ ...comments[0], parent_id: 'parent' }]]) {
    const { api } = reviewService(() => ({ data, error: null }));
    await assert.rejects(api.fetchTutorProfileReviews('t8'), /Invalid tutor review response/);
  }
  for (const rating of [{ tutor_id: 't9', user_id: 'u1', rating: 5 }, { tutor_id: 't8', user_id: 'other', rating: 5 }]) {
    const { api } = reviewService(request => ({ data: request.table === 'tutor_comments' ? comments : [rating], error: null }));
    await assert.rejects(api.fetchTutorProfileReviews('t8'), /Invalid tutor review rating response/);
  }
});

test('cancelled loads and invalid tutor IDs never reach the database', async () => {
  const { api, requests } = reviewService(() => ({ data: [], error: null }));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(api.fetchTutorProfileReviews('t8', controller.signal), /cancelled/);
  for (const id of ['', ' ', ' t8 ', null, 8]) {
    await assert.rejects(api.fetchTutorProfileReviews(id), /unavailable/);
  }
  assert.equal(requests.length, 0);
});
