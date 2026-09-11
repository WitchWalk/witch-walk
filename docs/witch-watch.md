# Witch Watch (Phase 9)

Open an attraction and choose **Witch Watch** to configure a crowd rule and an optional wait threshold. Manage saved rules through **More → Manage Witch Watch**. Watching is independent of Favorites and requires no location permission.

Settings and previous observed states are private, local AsyncStorage references under `@witch-walk/watches-v1`. The permission-request flag uses `@witch-walk/watch-permission-asked-v1`. No account, server, device location, or push token is collected.

The evaluator consumes Phase 7 aggregate results. Busy → Moderate (or directly Light) and Moderate → Light trigger the selected crowd rule. A wait rule triggers only when a previously observed wait above the selected threshold falls to or below it. Repeated qualifying states do not alert; a return above the threshold re-arms it. First observations and missing/stale reports establish a baseline and do not alert. Saving or re-enabling a rule establishes a new baseline.

Aggregate reads publish updates to Witch Watch. While the app is active, an additional 30-second refresh reads those same aggregates; this adds no separate calculation and no background task. Crossing state is serialized and persisted before local notification delivery to avoid repeated delivery from concurrent refreshes. A failed delivery is not retried automatically.

Expo notifications request permission only when enabling a watch and only once automatically after denial. The visitor can subsequently enable permission in device settings. A saved watch remains visible when permission is denied. Use a native Expo-compatible app/development build to test actual local notification delivery; web does not deliver notifications. Adding the notifications plugin requires rebuilding an existing native development binary.

The local repository currently contains only reports available on this device. Remote alerts based on other visitors' reports while the app is closed require a shared report backend, server-side watch evaluation, push tokens, and remote push delivery. Phase 9 does not provide these capabilities.

Run `node scripts/test-witch-watch.cjs` for deterministic crossing, adapter permission/delivery, and storage tests. Permission tests use mocked native adapters; verify OS permission prompts and notification banners separately on iPhone/Android.
