# Version Management

The version is defined in exactly one place: **`src/version.js`** (`APP_VERSION`).
The UI reads it from there, and the service worker names its cache after it, so
bumping it is what pushes new code to installed PWAs. Don't write the current
version anywhere else.

## Versioning Rules

Solar Symmetry uses **Semantic Versioning** (MAJOR.MINOR.PATCH):

- **PATCH** (1.4.2 → 1.4.3): bug fixes, minor tweaks, no new features
- **MINOR** (1.4.2 → 1.5.0): new features, enhancements, backward-compatible changes
- **MAJOR** (1.4.2 → 2.0.0): breaking changes, major redesigns

## How to Update the Version

1. Change `APP_VERSION` in `src/version.js`
2. Add an entry to the Version History below
3. Mention the new version in the commit message

## Version History

### 1.6.1 (2026-11-21)
- New look from the "First light" app icon (Phase 1b redo): "Warm water" read as a sunset on the home screen, and the app is about light returning, so every colour now says morning. The palette at the top of `src/styles/main.css` is dawn blue, lavender, dawn pink, peach and cream; no dark violet, plum or deep orange left. Headings and small icons are dawn blue; buttons, the active tab and today's date are peach with dark text (all checked against WCAG AA)
- Today card is a dawn sky: dawn blue with two faint stars at the top, lavender and pink lower down, the sun clearly above a peach/cream horizon with the message on it. The "Same light on" tile is a light mist pane with dark text
- Loading and pull-to-refresh screens use the dawn sky
- Native app: new "First light" icon and launch screen (dawn sky, sun at the horizon over calm water; `design/app-icon/*.svg`), replacing "Warm water"; home-screen name is now "SolarSym" (iOS cut "SolarSymmetry" off); launch background is cream `#fff0d6`

### 1.6.0 (2026-11-20)
- New look from the "Warm water" app icon (Phase 1b of `docs/NATIVE_APP_PLAN.md`): all colours are now named in one place at the top of `src/styles/main.css` (night, dusk violet/plum, sunrise coral, amber, cream); warm cream background instead of grey/white; amber replaces orange for the active tab, buttons and today's date, with dark text so it stays readable (checked against WCAG AA)
- Today card drawn like the icon: night sky with faint stars, sunrise towards the bottom, message on a warm "horizon" strip
- Loading and pull-to-refresh screens use the night sky instead of orange
- Native app: new icon and launch screen (rendered from `design/app-icon/*.svg`; the PNGs in that folder were blank and are now regenerated); the launch screen now stays until the first screen is drawn and then fades into it (`@capacitor/splash-screen` 8.0.2), instead of flashing grey

### 1.5.0 (2026-11-20)
- Native iOS and Android apps (Capacitor 8), Phase 1 of `docs/NATIVE_APP_PLAN.md`: the same web files run inside a native shell (App ID `com.solarsymmetry.app`); `npm run sync` copies them into `www/` and the native projects
- Icons (Lucide 1.69.0, pinned) and animations (anime.js 3.2.2) are now bundled in `src/vendor/` instead of loaded from CDNs: work offline, and the icon set can no longer change unannounced (it was `lucide@latest`)
- Edge-to-edge layout: header and page bottom keep clear of the notch/status bar and home bar (`viewport-fit=cover` + safe-area padding)
- In the native app: "Mobile App" install tab hidden, no service worker; app icon and splash screen from `icon.svg`; portrait only, light appearance with dark status bar text

### 1.4.0 (2026-11-20)
- Sun times are now calculated on the device (SunCalc 2.1.4, vendored in `src/vendor/`) instead of calling sunrise-sunset.org: instant, works offline, no rate limits
- Correct time zones for every city via offline lookup (@photostructure/tz-lookup 11.8.0); the old longitude guess showed e.g. Helsinki in Berlin time
- Golden hour uses the sun's angle (below 6°) instead of a fixed hour after sunrise / before sunset
- Polar day and night show "Up all day" / "No sunrise" instead of errors
- Date cards now show even if the animation library fails to load (e.g. offline)

### 1.3.0 (2026-11-20)
- New Today hero at the top of the Symmetry view: today vs. its mirror date in your city (sunrise, sunset, daylight length) with a short encouraging message
- The hero always shows the real today and loads first; the month list below loads after it (today's row then comes from the cache)

### 1.2.0 (2026-11-14)
- PWA auto-update: checks for a new version on open and when the app returns to the foreground; once data loading has finished it activates the new version and reloads once
- Reload-loop protection: no reload on first install, one reload per page, none within 60s of the last update reload
- Fixed service worker and manifest paths so they work on GitHub Pages (`/solar-symmetry/`); previously the service worker never registered there
- Service worker downloads fresh files on install (bypasses the browser's HTTP cache) and no longer intercepts API requests

### 1.1.0 (2026-11-14)
- Sun data loads in stages: today + its mirror first, then the rest of the month, then the start of the month
- Switched to sunrise-sunset.org API v2 with date ranges (about 6 requests per month instead of about 60)
- All API requests go through one queue (max 2 at once, max 4 per second) to stay under the API's 5 requests/second limit
- Removed a duplicate month load on startup that caused HTTP 429 (rate limit) errors
- Failed dates retry automatically (1s, 3s, 6s); a "Couldn't load N dates" line with a Retry button re-fetches only the failed dates
- Changing location/month/view cancels the old requests so stale data never overwrites new data
- Fixed dates being one day off during British Summer Time
- Version is now defined only in `src/version.js`; service worker cache is named after it

### 1.0.3 (2025-11-01)
- Removed location pin icons (📍) from all city input fields to save space
- Adjusted dropdown positioning after removing pins

### 1.0.2 (2025-11-01)
- Fixed cities compare column alignment (both city headers now same height)
- Removed "VS" divider to save vertical space in header

### 1.0.1 (2025-11-01)
- Fixed cities compare view not displaying data (missing animations)
- Added version number display in UI

### 1.0.0 (Initial Release)
- Solar symmetry view (mirror dates around solstices)
- Cities comparison view
- Golden hour toggle for photographers
- Light after work countdown timer
- PWA support with offline functionality
- Location search with localStorage persistence

## Why This Matters for PWAs

PWAs cache aggressively. The service worker cache is named `solar-symmetry-<version>`,
so a version bump makes browsers install a fresh copy of the app and delete the old
cache. The version shown in the UI lets users and developers confirm which version
is running.
