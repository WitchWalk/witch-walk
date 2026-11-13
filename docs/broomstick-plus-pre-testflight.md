# BROOMSTICK Plus — Pre-TestFlight Purchase Setup

## Production identifiers

- iOS bundle identifier: `com.housearauz.witchwalk`
- App Store Connect app ID: `6811139985`
- In-App Purchase type: **Non-Consumable**
- Reference name: `BROOMSTICK Plus`
- Product ID: `com.housearauz.witchwalk.plus`
- Target price: **$8.99 USD**
- RevenueCat entitlement ID: `broomstick_plus`
- RevenueCat offering: current offering with the Plus non-consumable attached
- RevenueCat package: use a Lifetime package when available

## Apple / App Store Connect

1. Confirm the Paid Apps Agreement is active and banking/tax information is complete.
2. Open the BROOMSTICK app in App Store Connect.
3. Monetization → In-App Purchases → +.
4. Create a **Non-Consumable** purchase:
   - Reference Name: `BROOMSTICK Plus`
   - Product ID: `com.housearauz.witchwalk.plus`
5. Add English (U.S.) localization:
   - Display Name: `BROOMSTICK Plus`
   - Description: `Unlock narrated Salem tours, custom tour building, smart rerouting, and TourSafe offline access.`
6. Set price to the closest available App Store price point to **$8.99 USD**.
7. Set availability for the storefronts where BROOMSTICK is sold.
8. Complete required review metadata and screenshot when preparing the IAP for review.

## RevenueCat

1. Create/open the BROOMSTICK RevenueCat project.
2. Add an Apple App Store app using bundle ID `com.housearauz.witchwalk`.
3. Connect App Store Connect credentials.
4. Import/add product `com.housearauz.witchwalk.plus`.
5. Create entitlement `broomstick_plus`.
6. Attach `com.housearauz.witchwalk.plus` to that entitlement.
7. Create or update the current Offering.
8. Add the product as a **Lifetime** package in the current Offering.
9. Copy the RevenueCat Apple public SDK key.

## EAS production environment

Set these values in the EAS production environment:

- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=<RevenueCat Apple public SDK key>`
- `EXPO_PUBLIC_BROOMSTICK_PLUS_ENTITLEMENT_ID=broomstick_plus`
- `EXPO_PUBLIC_BROOMSTICK_PLUS_PRODUCT_ID=com.housearauz.witchwalk.plus`
- `EXPO_PUBLIC_BROOMSTICK_PLUS_PRICE_FALLBACK=$8.99`

The RevenueCat public SDK key is intended to be embedded in the app. Do not put App Store Connect private keys, issuer IDs, or private API key material into `EXPO_PUBLIC_*` variables.

## Build requirement

The app uses `react-native-purchases`, which includes native code. Real purchase testing requires a fresh development or TestFlight build after dependencies and environment variables are configured.

Before EAS build:

```bash
pnpm install
pnpm expo install --check
pnpm run typecheck
```

## Sandbox test checklist

- Locked user can browse curated tours.
- Build My Own Tour redirects to Plus.
- Start Tour redirects to Plus.
- TourSafe download redirects to Plus.
- Sandbox purchase unlocks `broomstick_plus`.
- Plus remains unlocked after app relaunch.
- Restore Purchases unlocks Plus after reinstall/new device using the same Apple sandbox account.
- Cancelled purchase leaves Plus locked and does not show a false success.
- Developer Plus controls are absent from production builds.
