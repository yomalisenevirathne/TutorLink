const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const web = require('react-native-web');
const { renderToStaticMarkup } = require('react-dom/server');
const { transformSync } = require('@babel/core');

const { code } = transformSync(fs.readFileSync(path.join(__dirname, '../src/components/TutorProfileReviews.js'), 'utf8'), {
  babelrc: false, configFile: false,
  plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
});
const reviews = [{ id: 'c1', rating: 5, text: 'Helpful session.', authorName: 'Learner' }];

function preview(state, onOpenFeedback = () => {}) {
  let stateIndex = 0;
  const routes = [];
  const requests = [];
  const dependencies = {
    react: {
      ...React,
      useState: () => [state[stateIndex++], () => {}],
      useRef: () => ({ current: null }),
      useCallback: callback => callback,
    },
    'react-native': web,
    'expo-router': { useFocusEffect: () => {}, router: { push: route => routes.push(route) } },
    '../features/search/components/RatingStars': { RatingStars: () => React.createElement(web.Text, null, '5 stars') },
    '../services/tutorProfileReviews': {
      fetchTutorProfileReviews: (tutorId, signal) => {
        requests.push({ tutorId, signal });
        return Promise.resolve(reviews);
      },
    },
  };
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    assert.ok(dependencies[name], `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, loaded, loaded.exports);
  const tree = loaded.exports.default({ tutorId: 't8', styles: {}, onOpenFeedback });
  const html = renderToStaticMarkup(tree);
  let buttonDepth = 0;
  for (const match of html.matchAll(/<\/?button\b[^>]*>/g)) {
    buttonDepth += match[0].startsWith('</') ? -1 : 1;
    assert.ok(buttonDepth >= 0 && buttonDepth <= 1, 'Web buttons must never be nested');
  }
  assert.equal(buttonDepth, 0);
  return { tree, html, routes, requests };
}

test('loaded reviews render valid web buttons and keep feedback and View all actions separate', () => {
  let opened = 0;
  const { tree, html, routes } = preview([reviews, false, false], () => { opened++; });
  assert.match(html, /Helpful session\./);
  assert.match(html, /View all/);
  const [feedback, viewAll] = React.Children.toArray(tree.props.children);
  feedback.props.onPress();
  assert.equal(opened, 1);
  viewAll.props.onPress();
  assert.equal(opened, 1);
  assert.deepEqual(routes, [{ pathname: '/[page]', params: { page: 'feedbackComments', tutorId: 't8' } }]);
});

test('failed reviews render a separate Retry button that requests the same tutor', async () => {
  let opened = 0;
  const { tree, html, requests } = preview([[], false, true], () => { opened++; });
  assert.match(html, /Reviews could not be loaded/);
  const [, retry] = React.Children.toArray(tree.props.children);
  retry.props.onPress();
  assert.equal(opened, 0);
  assert.equal(requests[0].tutorId, 't8');
  assert.equal(requests[0].signal.aborted, false);
  await new Promise(resolve => setImmediate(resolve));
});

test('loading and empty states omit View all and Retry controls', () => {
  for (const [state, text] of [[[[], true, false], /Loading reviews/], [[[], false, false], /No reviews yet/]]) {
    const { html } = preview(state);
    assert.match(html, text);
    assert.doesNotMatch(html, /View all|Retry/);
  }
});
