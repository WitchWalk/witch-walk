const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const memory = new Map();
let granted = false;
let accept = false;
let prompts = 0;
let notifications = 0;
let remoteRegistrations = 0;
const storage = { getItem: async key => memory.get(key) ?? null, setItem: async (key, value) => { memory.set(key, value); } };
const originalLoad = Module._load;
Module._load = function (name, ...args) {
  if (name === '@react-native-async-storage/async-storage') return storage;
  if (name === 'react-native') return { Platform: { OS: 'ios' } };
  if (name === 'expo-constants') return { __esModule: true, default: { expoConfig: { extra: { eas: { projectId: 'test-project' } } }, easConfig: null } };
  if (name === '@/services/witchWatchRemoteRepository') return { registerRemotePushToken: async () => { remoteRegistrations++; return 'synced'; } };
  if (name === '@/config/witchWatchBackend') return { remoteWitchWatchEnabled: true };
  if (name === '@/data/attractions') return { getAttraction: () => ({ name: 'Witch House' }) };
  if (name === 'expo-notifications') return {
    getPermissionsAsync: async () => ({ granted, canAskAgain: true }),
    requestPermissionsAsync: async () => { prompts++; granted = accept; return { granted }; },
    setNotificationHandler() {},
    getExpoPushTokenAsync: async () => ({ data: 'ExpoPushToken[test_remote_token_123]' }),
    scheduleNotificationAsync: async () => { notifications++; },
  };
  return originalLoad.call(this, name, ...args);
};
Module._extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename);

(async () => {
  require('../src/services/witchWatchCore.test.ts');
  const service = require('../src/services/witchWatchNotifications.ts');
  const { witchWatchRepository } = require('../src/services/witchWatchRepository.ts');
  assert.equal(await service.enableWatchNotifications(), false);
  assert.equal(await service.enableWatchNotifications(), false);
  assert.equal(prompts, 1, 'Denial must not prompt repeatedly');
  await service.notifyWatch('Witch House', 'witch-house');
  assert.equal(notifications, 0);
  memory.clear(); accept = true;
  assert.equal(await service.enableWatchNotifications(), true);
  assert.equal(await service.enableRemoteWatchNotifications(), 'registered');
  assert.equal(remoteRegistrations, 1);
  await service.notifyWatch('Witch House', 'witch-house');
  assert.equal(notifications, 1);
  const watch = { attractionId: 'witch-house', enabled: true, crowdAlertType: 'busy-to-moderate', waitThresholdMinutes: 20, lastKnownCrowdStatus: null, lastKnownEstimatedWait: null, lastTriggeredState: null, lastAlertTimestamp: null };
  await witchWatchRepository.save([watch, { ...watch, attractionId: 'second' }]);
  assert.deepEqual(await witchWatchRepository.load(), [watch, { ...watch, attractionId: 'second' }]);
  await witchWatchRepository.save([{ ...watch, enabled: false, crowdAlertType: 'moderate-to-light', waitThresholdMinutes: 10 }]);
  assert.equal((await witchWatchRepository.load())[0].enabled, false);
  assert.equal((await witchWatchRepository.load())[0].waitThresholdMinutes, 10);
  await witchWatchRepository.save([]);
  assert.deepEqual(await witchWatchRepository.load(), []);
  console.log('Permission acceptance/denial, no repeated prompt, local delivery adapter, persistence, edit, disable, and removal passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
