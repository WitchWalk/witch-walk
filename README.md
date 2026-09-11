# Witch Walk

Witch Walk is an Expo + React Native mobile guide for exploring Salem, Massachusetts. This repository currently contains **Phase 1 only**: the reusable visual system, app navigation, the Home screen, and placeholder destinations.

## Phase 1 features

- TypeScript Expo app for iOS and Android
- Dark Salem-night design system with cream text and warm gold/orange accents
- Bottom navigation: Home, Map, Wait Times, Favorites, and More
- Home shortcuts for Live Map, Wait Times, Attractions, Restaurants, Parking, and Bathrooms
- Downtown Salem placeholder crowd-status card
- Working placeholder screens for every destination

No backend, authentication, notifications, live calculations, location verification, payments, business accounts, or Witch Watch features are included.

## Requirements

- Node.js LTS
- pnpm 11 (`corepack enable` installs the package-manager shim that ships with Node.js)
- Expo Go with SDK 57 support, a development build, or an iOS/Android simulator

## Run locally

```bash
corepack enable
pnpm install
pnpm start
```

After Expo starts, scan the QR code with an Expo Go client that supports SDK 57, or press:

- `i` to open the iOS Simulator (macOS only)
- `a` to open an Android emulator
- `w` to open the web preview

You can also launch a platform directly:

```bash
pnpm ios
pnpm android
```

## Supabase configuration

Create a `.env` file in the project root, beside `package.json`. You can copy `.env.example` as a starting point, then fill in these two values from the Supabase project's Connect panel:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Only the Supabase **publishable key** belongs in this Expo mobile app. Never add or ship a Supabase secret key, service-role key, or any other server-only credential. The real `.env` file is ignored by Git and must not be committed.

After creating or changing `.env`, restart the Expo development server so Expo can load the updated variables.

## Quality checks

Phase 11B-1 backend migration, security boundaries, test instructions, and deployment limitations are documented in [supabase/README.md](supabase/README.md). The app continues to use local wait reporting; the migration is not deployed or connected to the screens.

```bash
pnpm typecheck
pnpm lint
```

## Project structure

```text
app/                 Expo Router screens and layouts
src/components/      Reusable UI components
src/data/            Phase 1 placeholder content
src/theme/           Design tokens
App Icon/            Approved app artwork
Screen Designs/      Approved visual references
```

## Phase 1 data note

All crowd information and destination copy is intentionally placeholder data. The app does not make live network requests or perform location checks in this phase.
