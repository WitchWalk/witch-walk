# Mobile Bathroom content

Bathrooms use `src/services/bathroomContentRepository.ts` and the existing publishable Supabase client. One ordered SELECT reads the published, non-archived `broomstick_bathrooms` dataset; RLS is authoritative. No mobile writes, privileged credentials, schema changes, Storage bucket or Realtime subscription are added.

`BathroomsProvider` shares records with the browsing screen, Details route, restroom map, Live Map and Favorites. IDs remain unchanged. Favorites store references; unavailable records are omitted without deleting the saved reference. Supabase publication responses replace the directory, including successful empty responses.

The pure `bathroomContentCore.ts` parser maps access, seasonality, independent structured hours, amenities and advisories without inheriting bundled factual fields. Only local artwork is reused by stable ID. Hours are interpreted in America/New_York at presentation time. Seasonal notes remain verbatim text, not guaranteed dates. A generic Warning with NOT RECOMMENDED works independently of the location name. All amenity states remain Yes/No/Unknown; public access is not inferred from type or hours.

Directions prefer a validated HTTP(S) Admin URL, then valid paired coordinates, then the factual address. No destination displays the existing friendly map error. Missing coordinates omit pins, not list records. No image bucket is used.

## Reliability

- AsyncStorage key: `@witch-walk/bathroom-content-v1`, version 1.
- Six-hour maximum age, shared with the established content cache policy.
- Successful Supabase data always wins, including zero rows.
- On genuine failure: newest acceptable current/cache content, then bundled outage data.
- Cache timestamps are not extended by cache reads; expired/future/invalid caches are rejected.
- Foreground, Bathroom screen focus and pull-to-refresh use a 60-second minimum interval and share in-flight requests.
- No production records are seeded or published by the mobile app.

## Verification

Run `node --experimental-strip-types src/services/bathroomContentCore.test.ts` for mapper/cache behavior and `node scripts/test-bathroom-content.cjs` for repository, stable-ID, Map, Favorites and navigation-wiring compatibility. Add `--live` for read-only publishable-client production checks; values in `.env` are not printed.

On September 15, 2026 the public read returned only `salem-public-library-restrooms`, with Admin-edited name, description, access and independent hours mapped successfully. Hidden and archived queries returned zero rows. Read-only policy inspection confirmed RLS, published/non-archived public reads, no anonymous writes, and authenticated writes restricted to Admin authorization. There were no archived production fixtures; archived exclusion is additionally covered by local tests and the deployed policy, without creating a test record.

TypeScript, ESLint, Expo Doctor (21/21), iOS/Android exports and Bathroom/Attraction/Restaurant/Parking compatibility checks passed. Native device tap testing is still a review step; export and adapter tests are not a substitute for physical-device QA.

No Supabase deployment is needed. A future approved mobile release is required to distribute this code to installed production apps; no TestFlight build is part of this task. Changes remain uncommitted for review.
