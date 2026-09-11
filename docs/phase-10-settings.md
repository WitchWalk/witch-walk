# Phase 10 settings notes

App-owned preferences are stored together through `appSettingsRepository` under one versioned AsyncStorage key. The current record includes the Witch Watch master switch, both crowd-alert preferences, the default wait threshold, and the selected text-size preference.

Turning off the Witch Watch master switch pauses alert evaluation and delivery. It does not remove or disable the user's saved attraction watches. The existing watch records and thresholds remain available when the master switch is turned on again.

The `Larger` text-size preference is persisted, but it is intentionally not applied app-wide yet. Applying it safely requires a dedicated responsive-typography pass across the already approved screens. The Settings UI explains this limitation rather than changing those layouts during Phase 10.

Release-owned destinations live in `src/config/appLinks.ts`. Add the approved HOUSE ARAUZ URL and support email there before release. Final Privacy Policy and Terms of Service copy should replace the placeholders in `src/config/settingsContent.ts`.
