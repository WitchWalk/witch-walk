import { normalizeExpoTickets, type PushDelivery } from '../_shared/pushCore.ts';

const expoSendUrl = 'https://exp.host/--/api/v2/push/send';
const expoReceiptsUrl = 'https://exp.host/--/api/v2/push/getReceipts';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

type ReceiptClaim = { id: string; ticketId: string };

function secretKey() {
  const modern = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (modern) {
    try {
      const key = (JSON.parse(modern) as Record<string, unknown>).default;
      if (typeof key === 'string') return key;
    } catch { /* use legacy fallback */ }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
}

async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const url = Deno.env.get('SUPABASE_URL');
  const key = secretKey();
  if (!url || !key) throw new Error('Supabase server configuration unavailable');
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${name} failed with ${response.status}`);
  return response.json() as Promise<T>;
}

async function dispatchDeliveries() {
  const deliveries = await rpc<PushDelivery[]>('claim_witch_watch_deliveries', { p_limit: 100 });
  if (!deliveries.length) return 0;
  let results: ReturnType<typeof normalizeExpoTickets>;
  try {
    const response = await fetch(expoSendUrl, {
      method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(deliveries.map(({ to, title, body, data }) => ({ to, title, body, data, sound: 'default', channelId: 'witch-watch' }))),
    });
    results = response.ok ? normalizeExpoTickets(deliveries, await response.json())
      : deliveries.map(({ id }) => ({ id, status: 'failed', ticketId: '', errorCode: `ExpoHTTP${response.status}` }));
  } catch {
    results = deliveries.map(({ id }) => ({ id, status: 'failed', ticketId: '', errorCode: 'ExpoNetworkError' }));
  }
  await rpc('complete_witch_watch_deliveries', { p_results: results });
  return deliveries.length;
}

async function checkReceipts() {
  const claims = await rpc<ReceiptClaim[]>('claim_witch_watch_receipts', { p_limit: 300 });
  if (!claims.length) return 0;
  try {
    const response = await fetch(expoReceiptsUrl, { method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' }, body: JSON.stringify({ ids: claims.map((claim) => claim.ticketId) }) });
    if (!response.ok) return 0;
    const payload = await response.json() as { data?: Record<string, { status?: string; details?: { error?: string } }> };
    await rpc('complete_witch_watch_receipts', { p_results: claims.map((claim) => {
      const receipt = payload.data?.[claim.ticketId];
      return { id: claim.id, status: receipt?.status ?? 'error', errorCode: receipt?.details?.error ?? (receipt ? '' : 'ReceiptUnavailable') };
    }) });
    return claims.length;
  } catch { return 0; }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const expected = Deno.env.get('WITCH_WATCH_DISPATCH_SECRET');
  if (!expected || request.headers.get('x-witch-watch-secret') !== expected) return new Response('Unauthorized', { status: 401 });
  try {
    const [delivered, receipts] = await Promise.all([dispatchDeliveries(), checkReceipts()]);
    return Response.json({ ok: true, delivered, receipts });
  } catch (error) {
    console.error('Witch Watch dispatch failed', error instanceof Error ? error.message : 'unknown');
    return Response.json({ ok: false }, { status: 500 });
  }
});
