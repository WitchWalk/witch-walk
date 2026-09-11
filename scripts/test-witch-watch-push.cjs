const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename);

const { normalizeExpoTickets } = require('../supabase/functions/_shared/pushCore.ts');
const deliveries = [
  { id: 'one', to: 'ExpoPushToken[one]', title: 'Witch Watch', body: 'Improved', data: { attractionId: 'witch-house' } },
  { id: 'two', to: 'ExpoPushToken[two]', title: 'Witch Watch', body: 'Improved', data: { attractionId: 'museum' } },
];
assert.deepEqual(normalizeExpoTickets(deliveries, { data: [
  { status: 'ok', id: 'ticket-one' },
  { status: 'error', details: { error: 'DeviceNotRegistered' } },
] }), [
  { id: 'one', status: 'sent', ticketId: 'ticket-one', errorCode: '' },
  { id: 'two', status: 'failed', ticketId: '', errorCode: 'DeviceNotRegistered' },
]);
assert.deepEqual(normalizeExpoTickets(deliveries, { data: [] }).map((row) => row.errorCode),
  ['ExpoPushUnavailable', 'ExpoPushUnavailable']);
const edge = fs.readFileSync(require.resolve('../supabase/functions/witch-watch-dispatch/index.ts'), 'utf8');
assert.match(edge, /p_limit: 100/);
assert.match(edge, /WITCH_WATCH_DISPATCH_SECRET/);
assert.match(edge, /complete_witch_watch_receipts/);
assert.doesNotMatch(edge, /EXPO_PUBLIC_/);
console.log('PASS: Expo ticket mapping, invalid-token handling, batch limit, receipt path, and server-only configuration');
