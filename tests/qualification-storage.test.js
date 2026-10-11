const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('@babel/core');

function documents({ bucket, platform = 'web', owner = 'tutor-1' } = {}) {
  const calls = [];
  const bytes = new Uint8Array([1, 2, 3]).buffer;
  const supabase = {
    auth: { getUser: async () => { calls.push('auth'); return { data: { user: { id: owner } }, error: null }; } },
    storage: { from(name) {
      return { upload: async (filePath, body, options) => {
        calls.push({ bucket: name, filePath, body, options });
        return { data: { path: filePath }, error: null };
      } };
    } },
  };
  const dependencies = {
    'react-native': { Platform: { OS: platform } },
    'expo-file-system': { File: class { async arrayBuffer() { calls.push('file'); return bytes; } } },
    '../utils/supabase': { supabase },
  };
  const { code } = transformSync(fs.readFileSync(path.join(__dirname, '../src/services/qualificationDocuments.js'), 'utf8'), {
    babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'process', 'fetch', code)(
    (name) => dependencies[name], module, module.exports,
    { env: { EXPO_PUBLIC_QUALIFICATION_BUCKET: bucket } },
    async () => { calls.push('fetch'); return { arrayBuffer: async () => bytes }; },
  );
  return { ...module.exports, calls };
}

const document = { name: 'degree.pdf', uri: 'local-document', mimeType: 'application/pdf' };

test('unconfigured qualification storage never assumes or creates a bucket', async () => {
  const api = documents();
  await assert.rejects(api.uploadQualificationDocument('tutor-1', document), /existing bucket/);
  assert.deepEqual(api.calls, []);
});

test('web and native qualification uploads use the configured existing bucket', async () => {
  for (const platform of ['web', 'android', 'ios']) {
    const api = documents({ bucket: 'existing-profile-documents', platform });
    const saved = await api.uploadQualificationDocument('tutor-1', document);
    assert.equal(saved.bucket, 'existing-profile-documents');
    const upload = api.calls.find((call) => typeof call === 'object');
    assert.equal(upload.bucket, saved.bucket);
    assert.match(upload.filePath, /^tutor-1\//);
    assert.equal(upload.options.upsert, false);
  }
});

test('another account cannot upload qualifications under the requested owner', async () => {
  const api = documents({ bucket: 'existing-profile-documents', owner: 'other-user' });
  await assert.rejects(api.uploadQualificationDocument('tutor-1', document), /Sign in/);
  assert.deepEqual(api.calls, ['auth']);
});
