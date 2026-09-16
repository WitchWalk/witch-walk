/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const originalLoad = Module._load;
let stored = null;
let queryCount = 0;
let selectedKeys = [];
const rows = [
  { key: 'house_arauz_youtube_channel_url', value: 'https://www.youtube.com/@housearauz' },
  { key: 'privacy_policy_url', value: 'https://broomstick-site.vercel.app/privacy/' },
  { key: 'terms_of_service_url', value: 'https://broomstick-site.vercel.app/terms/' },
  { key: 'support_url', value: 'https://example.com/support' },
  { key: 'support_email', value: 'support@example.com' },
  { key: 'about_broomstick_text', value: 'A plain-text Salem guide.' },
];
Module._load = function (name, ...args) {
  if (name === '@react-native-async-storage/async-storage') return {
    __esModule: true,
    default: { getItem: async () => stored, setItem: async (_key, value) => { stored = value; } },
  };
  if (name === '@/lib/supabase') return { supabase: { from(table) {
    assert.equal(table, 'broomstick_app_settings');
    return { select(columns) {
      assert.equal(columns, 'key,value');
      return { in(column, keys) { queryCount++; assert.equal(column, 'key'); selectedKeys = keys; return Promise.resolve({ data: rows, error: null }); } };
    } };
  } } };
  if (name === 'expo-constants') return { __esModule: true, default: { expoConfig: { version: '1.0.0' }, platform: { ios: { buildNumber: '12' } } } };
  if (name === 'react-native') return { Platform: { OS: 'ios' }, Linking: {} };
  if (name.startsWith('@/')) name = path.join(root, 'src', name.slice(2));
  return originalLoad.call(this, name, ...args);
};
Module._extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename);

const core = require('../src/services/publicSettingsCore.ts');
const mapped = core.mapPublicSettings([...rows, { key: 'private_setting', value: 'must not map' }]);
assert.deepEqual(mapped, {
  houseArauzYoutubeChannelUrl: rows[0].value,
  privacyPolicyUrl: rows[1].value,
  termsOfServiceUrl: rows[2].value,
  supportUrl: rows[3].value,
  supportEmail: rows[4].value,
  aboutBroomstickText: rows[5].value,
});
assert.equal(core.validatePublicHttpsUrl('http://unsafe.example'), null);
assert.equal(core.validatePublicHttpsUrl('javascript:alert(1)'), null);
assert.equal(core.validateSupportEmail('bad\n@example.com'), null);
assert.equal(core.createSupportEmailUrl('support@example.com'), 'mailto:support@example.com?subject=BROOMSTICK%20Support');
assert.deepEqual(core.mapPublicSettings([{ key: 'about_broomstick_text', value: null }]), core.EMPTY_PUBLIC_SETTINGS);
assert.deepEqual(core.mapPublicSettings([
  { key: 'privacy_policy_url', value: 'http://unsafe.example' },
  { key: 'terms_of_service_url', value: 'not a URL' },
  { key: 'support_url', value: 'javascript:alert(1)' },
  { key: 'support_email', value: 'invalid' },
  { key: 'house_arauz_youtube_channel_url', value: 'https://example.com/not-youtube' },
  { key: 'about_broomstick_text', value: '   ' },
]), core.EMPTY_PUBLIC_SETTINGS);

const cached = core.parsePublicSettingsCache(core.serializePublicSettingsCache(mapped, 1_000), 2_000);
assert.deepEqual(cached.settings, mapped);
assert.equal(core.parsePublicSettingsCache(core.serializePublicSettingsCache(mapped, 1_000), 1_000 + core.PUBLIC_SETTINGS_CACHE_MAX_AGE_MILLISECONDS + 1), null);

async function verifyCacheRules() {
  const cachedValue = core.serializePublicSettingsCache(mapped, 1_000);
  const fallback = await core.loadPublicSettingsCore({
    now: 2_000,
    fetchSettings: async () => { throw new Error('offline'); },
    readCache: async () => cachedValue,
    writeCache: async () => undefined,
  });
  assert.equal(fallback.source, 'cache');
  assert.deepEqual(fallback.settings, mapped);
  const authoritativeEmpty = await core.loadPublicSettingsCore({
    now: 2_000,
    fetchSettings: async () => rows.map(row => ({ key: row.key, value: null })),
    readCache: async () => cachedValue,
    writeCache: async () => undefined,
  });
  assert.equal(authoritativeEmpty.source, 'supabase');
  assert.deepEqual(authoritativeEmpty.settings, core.EMPTY_PUBLIC_SETTINGS);
}

async function live() {
  const env = Object.fromEntries(read('.env').split(/\r?\n/).filter(line => line.includes('=')).map(line => {
    const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)];
  }));
  const { createClient } = require('@supabase/supabase-js');
  const client = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const response = await client.from('broomstick_app_settings').select('key,value').in('key', [...core.PUBLIC_SETTING_KEYS]);
  assert.equal(response.error, null);
  const settings = core.mapPublicSettings(response.data);
  assert.deepEqual(response.data.map(row => row.key).sort(), [...core.PUBLIC_SETTING_KEYS].sort());
  assert.equal(settings.privacyPolicyUrl, 'https://broomstick-site.vercel.app/privacy/');
  assert.equal(settings.termsOfServiceUrl, 'https://broomstick-site.vercel.app/terms/');
  assert.ok(settings.supportUrl && settings.supportEmail && settings.aboutBroomstickText && settings.houseArauzYoutubeChannelUrl);
  const unrelated = await client.from('broomstick_app_settings').select('key')
    .not('key', 'in', `(${core.PUBLIC_SETTING_KEYS.join(',')})`);
  assert.equal(unrelated.error, null);
  assert.deepEqual(unrelated.data, []);
  console.log('Production publishable read: all six public settings visible, legal URLs exact, unrelated settings inaccessible; no writes.');
}

(async () => {
  await verifyCacheRules();
  const repository = require('../src/services/publicSettingsRepository.ts');
  const first = await repository.loadPublicSettings(5_000);
  assert.equal(first.source, 'supabase');
  assert.deepEqual(first.settings, mapped);
  assert.equal(queryCount, 1);
  assert.deepEqual(selectedKeys, [...core.PUBLIC_SETTING_KEYS]);

  const { openSupportPage } = require('../src/services/supportLink.ts');
  let opened = 0;
  const opener = { canOpenURL: async () => true, openURL: async () => { opened++; } };
  assert.equal(await openSupportPage('javascript:alert(1)', opener), false);
  assert.equal(opened, 0);
  assert.equal(await openSupportPage(rows[3].value, opener), true);
  assert.equal(opened, 1);

  const metadata = require('../src/services/appMetadata.ts');
  assert.equal(metadata.getInstalledAppVersionLabel(), 'Version 1.0.0 (12)');
  assert.equal(metadata.formatVersionBuild('1.0.0', null), 'Version 1.0.0');

  const more = read('app/(tabs)/more.tsx');
  assert.match(more, /publicSettings\.aboutBroomstickText/);
  assert.match(more, /<Text style=\{styles\.aboutText\}>\{publicSettings\.aboutBroomstickText\}<\/Text>/);
  assert.doesNotMatch(more, /Markdown|dangerouslySetInnerHTML|renderHTML/);
  for (const field of ['privacyPolicyUrl', 'termsOfServiceUrl', 'supportUrl', 'supportEmail', 'houseArauzYoutubeChannelUrl']) assert.match(more, new RegExp(`publicSettings\\.${field}`));
  assert.match(more, /Enable Witch Watch/);
  assert.match(more, /Push Notifications/);
  assert.match(more, /Location Access/);
  assert.match(more, /getInstalledAppVersionLabel/);
  assert.doesNotMatch(read('src/services/supportLink.ts'), /paypal|venmo/i);
  assert.doesNotMatch(more, /broomstick-site\.vercel\.app|paypal|venmo|mailto:[^`$]/i);
  assert.match(read('app/settings/support-witch-walk.tsx'), /openSupportPage\(settings\.supportUrl\)/);
  assert.match(read('src/services/houseArauzContentRepository.ts'), /loadPublicSettings/);
  if (process.argv.includes('--live')) await live();
  console.log('PASS: centralized public settings, safe mapping/cache/links, plain About text, runtime version/build, and Settings compatibility');
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
