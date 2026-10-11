const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('@babel/core');

const kasunId = 'd96130e6-002a-41b0-a8f2-b0e6c814a98c';
const otherId = 'bca06201-2c5b-49b2-91db-7a01f0ac6342';
const kasun = { id: kasunId, full_name: 'kasunbandara', email: 'kasunbandara@gmail.com', role: 'Tutor',
  avatar_url: 'https://example.com/kasun.jpg', about_you: 'Programming tutor' };

function directory(tables, { pageLimit = Infinity, errors = {} } = {}) {
  const requests = [];
  const client = { from(table) {
    const request = { table, filters: [], order: [] };
    requests.push(request);
    const result = async (single = false) => {
      if (errors[table]) return { data: null, error: errors[table] };
      let data = (tables[table] || []).filter(row => request.filters.every(([kind, column, value]) => {
        if (kind === 'in') return value.includes(row[column]);
        if (kind === 'ilike') return String(row[column]).toLowerCase()
          === value.replace(/\\([\\%_])/g, '$1').toLowerCase();
        return row[column] === value;
      }));
      if (request.range) data = data.slice(request.range[0], Math.min(request.range[1] + 1, request.range[0] + pageLimit));
      return { data: single ? data[0] || null : data, error: null };
    };
    const query = {
      select(columns) { request.columns = columns; return query; },
      eq(column, value) { request.filters.push(['eq', column, value]); return query; },
      ilike(column, value) { request.filters.push(['ilike', column, value]); return query; },
      in(column, values) { request.filters.push(['in', column, values]); return query; },
      order(column) { request.order.push(column); return query; },
      range(start, end) { request.range = [start, end]; return query; },
      abortSignal(signal) { request.signal = signal; return query; },
      maybeSingle: () => result(true),
      then(resolve, reject) { return result().then(resolve, reject); },
    };
    return query;
  } };
  function load(file, dependencies) {
    const { code } = transformSync(fs.readFileSync(path.join(__dirname, '../src/services', file), 'utf8'), {
      babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
    });
    const module = { exports: {} };
    new Function('require', 'module', 'exports', code)((name) => {
      assert.ok(name in dependencies, `Unexpected dependency ${name}`);
      return dependencies[name];
    }, module, module.exports);
    return module.exports;
  }
  const exports = load('tutorDirectory.js', { '../utils/supabase': { supabase: client } });
  const tutorService = load('tutorService.js', { '../utils/supabase': { supabase: client }, './tutorDirectory': exports }).tutorService;
  const feedbackTutors = load('tutors.js', { './tutorDirectory': exports });
  return { ...exports, tutorService, feedbackTutors, requests };
}

test('existing listings and every Tutor account share the discovery and feedback directories', async () => {
  const data = directory({
    tutors: [{ id: 't10', name: 'Existing Tutor', hourlyRate: 900, verifiedStatus: 'verified' }],
    profiles: [kasun, { id: otherId, full_name: 'Student', role: 'Student' }],
    tutor_profiles: [{ user_id: kasunId, subjects: ['Programming'], hourly_rate: 1800, experience_level: 'Experienced', is_verified_tutor: false }],
  });
  const tutors = await data.tutorService.list();
  assert.deepEqual(tutors.map(tutor => tutor.id), ['t10', kasunId]);
  const account = tutors[1];
  assert.equal(account.name, 'kasunbandara');
  assert.equal(account.user_id, kasunId);
  assert.equal(account.photoUrl, kasun.avatar_url);
  assert.equal(account.hourlyRate, 1800);
  assert.equal(account.bio, kasun.about_you);
  assert.deepEqual(account.subjects, ['Programming']);
  assert.equal(account.verifiedStatus, 'unverified');
  assert.equal(account.avgRating, 0);
  const feedback = await data.feedbackTutors.fetchAllTutors();
  assert.deepEqual(feedback.map(tutor => tutor.id), ['t10', kasunId]);
  assert.equal(feedback[1].fullName, account.name);
  assert.equal(feedback[1].avatarUrl, account.photoUrl);
  assert.ok(data.requests.filter(request => request.table === 'profiles')
    .every(request => request.filters.some(filter => filter[1] === 'role' && filter[2] === 'Tutor')));
  assert.ok(data.requests.every(request => !('record' in request)));
});

test('linked accounts deduplicate by user ID, profile ID and normalized email while retaining existing text IDs', () => {
  const { mergeTutorDirectory } = directory({});
  for (const identity of [
    { user_id: kasunId }, { id: kasunId }, { email: ' KASUNBANDARA@gmail.com ' },
  ]) {
    const listing = { id: 't10', name: 'Published Name', subjects: ['Physics'], hourlyRate: 925,
      verifiedStatus: 'verified', ...identity };
    const tutors = mergeTutorDirectory([listing], [kasun]);
    assert.equal(tutors.length, 1);
    assert.equal(tutors[0].id, listing.id);
    assert.equal(tutors[0].listingId, listing.id);
    assert.equal(tutors[0].user_id, kasunId);
    assert.equal(tutors[0].name, listing.name);
    assert.equal(tutors[0].hourlyRate, 925);
    assert.deepEqual(tutors[0].subjects, ['Physics']);
  }
});

test('same names do not merge people and explicit account IDs take precedence over email', () => {
  const { mergeTutorDirectory } = directory({});
  const tutors = mergeTutorDirectory([
    { id: 't10', name: kasun.full_name, user_id: otherId, email: kasun.email },
  ], [kasun]);
  assert.equal(tutors.length, 2);
  assert.equal(tutors.find(tutor => tutor.id === 't10').user_id, otherId);
  assert.ok(tutors.some(tutor => tutor.id === kasunId));
});

test('duplicate listings for one account produce one card without mutating source records', () => {
  const { mergeTutorDirectory } = directory({});
  const listings = [{ id: 't10', name: 'First', user_id: kasunId }, { id: 't11', name: 'Second', user_id: kasunId }];
  const before = JSON.stringify(listings);
  const tutors = mergeTutorDirectory(listings, [kasun]);
  assert.equal(tutors.length, 1);
  assert.equal(tutors[0].id, 't10');
  assert.equal(JSON.stringify(listings), before);
});

test('pagination includes records after a backend response limit smaller than the page size', async () => {
  const data = directory({ tutors: [
    { id: 't1', name: 'A' }, { id: 't2', name: 'B' }, { id: 't3', name: 'C' },
  ], profiles: [kasun] }, { pageLimit: 2 });
  const tutors = await data.listDirectoryTutors();
  assert.equal(tutors.length, 4);
  assert.deepEqual(data.requests.filter(request => request.table === 'tutors').map(request => request.range),
    [[0, 199], [2, 201], [3, 202]]);
});

test('a Tutor account without extra details still displays and opens with its correct identity', async () => {
  const data = directory({ profiles: [kasun] });
  const tutors = await data.tutorService.list();
  const detail = await data.tutorService.getById(kasunId);
  assert.deepEqual(detail, tutors[0]);
  assert.equal(detail.name, kasun.full_name);
  assert.equal(detail.listingId, null);
  assert.equal(detail.verifiedStatus, 'unverified');
  assert.equal(detail.hourlyRate, 0);
  assert.deepEqual(detail.subjects, []);
  const feedback = await data.feedbackTutors.fetchTutorById(kasunId);
  assert.equal(feedback.fullName, kasun.full_name);
  assert.equal(feedback.canReceiveFeedback, false);
});

test('email-linked legacy listings show the same account photo in cards and details', async () => {
  const data = directory({ tutors: [{ id: 't10', name: 'Published Tutor', email: 'KASUNBANDARA@gmail.com' }], profiles: [kasun] });
  const list = await data.listDirectoryTutors();
  const detail = await data.getDirectoryTutor('t10');
  assert.deepEqual(detail, list[0]);
  assert.equal(detail.id, 't10');
  assert.equal(detail.user_id, kasunId);
});

test('Student accounts cannot be opened as tutors using a UUID route', async () => {
  const data = directory({ profiles: [{ ...kasun, role: 'Student' }] });
  assert.equal(await data.getDirectoryTutor(kasunId), null);
});

test('permission errors loading the account directory are surfaced instead of reporting a complete list', async () => {
  const denied = { message: 'Permission denied', code: '42501' };
  const data = directory({ tutors: [{ id: 't10', name: 'Existing' }] }, { errors: { profiles: denied } });
  await assert.rejects(data.listDirectoryTutors(), error => error === denied);
});

test('unavailable extra profile details never remove a Tutor account', async () => {
  const data = directory({ profiles: [kasun] }, { errors: { tutor_profiles: { message: 'Details unavailable' } } });
  const tutors = await data.listDirectoryTutors();
  assert.equal(tutors[0].id, kasunId);
  assert.equal(tutors[0].name, kasun.full_name);
});

test('cancelled loads do not send queries and cancellation reaches every directory query', async () => {
  const controller = new AbortController();
  const data = directory({ profiles: [kasun] });
  await data.listDirectoryTutors({ signal: controller.signal });
  assert.ok(data.requests.every(request => request.signal === controller.signal));
  controller.abort();
  const count = data.requests.length;
  await assert.rejects(data.listDirectoryTutors({ signal: controller.signal }), /cancelled/);
  await assert.rejects(data.getDirectoryTutor(kasunId, { signal: controller.signal }), /cancelled/);
  assert.equal(data.requests.length, count);
});
