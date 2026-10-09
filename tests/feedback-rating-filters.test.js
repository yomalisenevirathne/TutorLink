const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('@babel/core');

function load(file) {
  const { code } = transformSync(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const module = { exports: {} };
  new Function('module', 'exports', code)(module, module.exports);
  return module.exports;
}
const { withFeedbackRatings } = load('data/tutorFeedbackSearch.js');
const { applyFilters, DEFAULT_FILTERS } = load('features/search/utils/filters.js');

const tutors = [
  { id: 'unrated', name: 'Unrated', avgRating: 5, reviewCount: 88, hourlyRate: 1500, languages: ['English'], modesOffered: ['online'] },
  { id: 'newly-rated', name: 'Newly rated', avgRating: 2, reviewCount: 0, hourlyRate: 950, languages: ['Sinhala'], modesOffered: ['online'], subjects: ['Programming'] },
  { id: 'boundary', name: 'Boundary', avgRating: 1, reviewCount: 0, hourlyRate: 700, languages: ['English'], modesOffered: ['physical'] },
  { id: 'below', name: 'Below', avgRating: 5, reviewCount: 100, hourlyRate: 600, languages: ['English'], modesOffered: ['online'] },
];
const summaries = new Map([
  ['unrated', { average: 0, total: 0 }],
  ['newly-rated', { average: 5, total: 1 }],
  ['boundary', { average: 4.5, total: 2 }],
  ['below', { average: 4.49, total: 10 }],
]);

test('4.5+ uses real feedback and checks every tutor before filtering', () => {
  const results = applyFilters(withFeedbackRatings(tutors, summaries), '', { ...DEFAULT_FILTERS, minRating: 4.5 });
  assert.deepEqual(new Set(results.map(tutor => tutor.id)), new Set(['newly-rated', 'boundary']));
  assert.ok(results.every(tutor => tutor.avgRating >= 4.5));
});

test('rating sorting and ties use the same live averages and counts shown on cards', () => {
  const tied = new Map(summaries);
  tied.set('boundary', { average: 5, total: 2 });
  const results = applyFilters(withFeedbackRatings(tutors, tied), '', { ...DEFAULT_FILTERS, sort: 'ratingDesc' });
  assert.deepEqual(results.map(tutor => tutor.id), ['boundary', 'newly-rated', 'below', 'unrated']);
});

test('query, price, language, and session mode keep their existing filtering behavior', () => {
  const rated = withFeedbackRatings(tutors, summaries);
  const results = applyFilters(rated, 'Programming', {
    ...DEFAULT_FILTERS, minRating: 4.5, priceMin: 900, priceMax: 1000, languages: ['Sinhala'], mode: 'online',
  });
  assert.deepEqual(results.map(tutor => tutor.id), ['newly-rated']);
  assert.equal(applyFilters(rated, 'Programming', { ...DEFAULT_FILTERS, mode: 'physical' }).length, 0);
  assert.deepEqual(applyFilters(rated, '', { ...DEFAULT_FILTERS, sort: 'priceAsc' }).map(tutor => tutor.hourlyRate), [600, 700, 950, 1500]);
});

test('clearing the rating filter includes unrated tutors again', () => {
  const results = applyFilters(withFeedbackRatings(tutors, summaries), '', DEFAULT_FILTERS);
  assert.equal(results.length, tutors.length);
  assert.ok(results.some(tutor => tutor.id === 'unrated' && tutor.avgRating === 0 && tutor.reviewCount === 0));
});

test('refreshed feedback can add or remove tutors without relying on stored discovery scores', () => {
  const changed = new Map(summaries);
  changed.set('unrated', { average: 5, total: 1 });
  changed.set('newly-rated', { average: 3, total: 2 });
  const results = applyFilters(withFeedbackRatings(tutors, changed), '', { ...DEFAULT_FILTERS, minRating: 4.5 });
  assert.deepEqual(new Set(results.map(tutor => tutor.id)), new Set(['unrated', 'boundary']));
});

test('overlaying live feedback preserves original tutors and their unrelated fields', () => {
  const before = JSON.stringify(tutors);
  const rated = withFeedbackRatings(tutors, summaries);
  assert.equal(JSON.stringify(tutors), before);
  for (let i = 0; i < tutors.length; i++) {
    assert.notEqual(rated[i], tutors[i]);
    const { avgRating, reviewCount, ...rest } = rated[i];
    const { avgRating: oldRating, reviewCount: oldCount, ...original } = tutors[i];
    assert.deepEqual(rest, original);
  }
  assert.throws(() => withFeedbackRatings(tutors, new Map()), /not finished loading/);
});
