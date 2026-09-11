// Run with PGLITE_MODULE pointing to an externally installed @electric-sql/pglite.
// This creates only an ephemeral database, never connects to the hosted project.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/202609110001_wait_report_foundation.sql', import.meta.url), 'utf8'));
  const identity = async (id = '00000000-0000-0000-0000-000000000001') => {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  };
  const submit = async (overrides = {}) => {
    const input = { attraction: 'witch-house', key: 'first', wait: 20, crowd: 'moderate', tag: null,
      lat: 42.5215539, lng: -70.8988987, accuracy: 10, timestamp: new Date().toISOString(), mocked: false, ...overrides };
    const result = await db.query('select public.submit_wait_report($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) as result', Object.values(input));
    return result.rows[0].result;
  };
  await identity();
  await db.exec('set role anon');
  await assert.rejects(submit());
  await assert.rejects(db.query('select * from wait_private.wait_reports'));
  await db.exec('reset role; set role authenticated');
  await assert.rejects(db.query('select * from wait_private.wait_reports'));
  await assert.rejects(db.query("delete from wait_private.wait_reports"));
  await assert.rejects(db.query("update wait_private.reporting_rules set radius_meters = 99999"));
  await identity('');
  await assert.rejects(submit());
  await identity();
  const first = await submit();
  assert.equal(first.kind, 'success');
  const retry = await submit();
  assert.equal(retry.kind, 'duplicate');
  assert.equal(retry.reportId, first.reportId);
  assert.equal(retry.submittedAt, first.submittedAt);
  assert.equal((await submit({ wait: 30 })).kind, 'idempotency-conflict');
  assert.equal((await submit({ key: 'second' })).kind, 'cooldown');
  for (const invalid of [{ wait: 5 }, { wait: null }, { crowd: 'fake' }, { crowd: null },
    { tag: 'free text' }, { key: '' }, { key: 'x'.repeat(129) }, { attraction: 'not-allowed' }]) {
    assert.equal((await submit({ key: 'invalid', ...invalid })).kind, 'invalid');
  }
  for (const invalid of [{ lat: 0 }, { accuracy: 51 }, { accuracy: -1 }, { accuracy: null },
    { lat: 'NaN' }, { lng: 'Infinity' }, { mocked: true }, { mocked: null },
    { timestamp: new Date(Date.now() - 60000).toISOString() },
    { timestamp: new Date(Date.now() + 60000).toISOString() }, { timestamp: 'infinity' }]) {
    assert.equal((await submit({ key: 'gps', ...invalid })).kind, 'location-failed');
  }
  await identity('00000000-0000-0000-0000-000000000002');
  assert.equal((await submit()).kind, 'success');
  await identity();
  await db.exec("reset role; update wait_private.wait_reports set submitted_at = clock_timestamp() - interval '11 minutes'; set role authenticated");
  assert.equal((await submit({ key: 'after-cooldown' })).kind, 'success');
  const rapid = await Promise.all([submit({ key: 'rapid' }), submit({ key: 'rapid' })]);
  assert.ok(rapid.every((result) => result.kind === 'cooldown'));
  await identity('00000000-0000-0000-0000-000000000002');
  const firstRapid = await Promise.all([submit({ key: 'new-rapid' }), submit({ key: 'new-rapid' })]);
  assert.deepEqual(firstRapid.map((result) => result.kind), ['success', 'duplicate']);
  assert.equal(firstRapid[0].reportId, firstRapid[1].reportId);
  await db.exec('reset role');
  assert.equal((await db.query('select count(*)::int as count from wait_private.wait_reports')).rows[0].count, 4);
  console.log('PASS: migration, permissions, identities, validation, GPS, cooldown, idempotency, no extra rows');
} finally {
  await db.close();
}
