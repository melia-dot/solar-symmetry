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

### 1.7.5 (2026-11-21)
- Launch screen shortened to about 1 second (1.5 seconds felt too long)

### 1.7.4 (2026-11-21)
- The launch screen now stays for about 1.5 seconds before fading into the app, instead of flashing past (it still hides by itself after 3 seconds if anything goes wrong)

### 1.7.3 (2026-11-21)
- Top bar: only the tabs and the gear stay fixed; the city search and the month heading scroll with the page. The version moved from the top to the very bottom of the page (small, centred; still in Settings)
- Place names show the town, not the council district ("Southport", not "Sefton"): search and "Use my location" now use the most local place OpenStreetMap returns. A city saved before 1.7.3 keeps its old name until it's picked again
- Today tile fits on small phones (iPhone SE): each label sits above its big time, so "Same light on" is fully visible next to Today
- Day list: Daybreak and Dark by are the big times on every card; Sunrise, Sunset and the golden hours ("Golden 07:49–08:49") are small, one line each. Sunrise and sunset have different icons. A date and its mirror sit in one row with the same height and the same background; today's row is highlighted (today gold, its mirror outlined in gold)
- The whole month (1st to last) is part of the normal page scroll; no more sideways-scrolling box on small phones. New "Jump to today ↓" link above the list scrolls smoothly to today's row (shown when the month includes today)

### 1.7.2 (2026-11-21)
- Today tile: the two big times are now **Daybreak** (civil dawn: light enough to see outside) and **Dark by** (civil dusk), for today and its "Same light on" date. Sunrise, sunset and daylight stay on the tile, smaller, underneath. Near the poles it says "Light all night" or "Dark all day" where there's no civil dawn/dusk
- Home screen order: Today tile, then "Light after work", then the month (e.g. November) with its day list
- Mirror-date matching unchanged

### 1.7.1 (2026-11-21)
- Fixed: after "Turn on messages" the welcome screens could start again from screen 1 instead of opening the app. On iPhone, waiting for a native plugin (notifications, location, in-app browser) never finished, so the notification and "Use my location" buttons hung; now they work
- Onboarding is now saved (done, with your chosen moments) before the phone asks about notifications, so it always ends in the app, whether you tap Allow or Don't Allow
- Pull-to-refresh no longer works on top of the welcome screens or Settings, and a plain tap can no longer count as a pull (both could reload the app)

### 1.7.0 (2026-11-21)
- Welcome screens on first launch (Phase 2): pick your city (search or "Use my location"), an optional Yes / No for anonymous usage stats (off unless you say Yes), and the companion messages with a preview and the choice of Morning / Before sunset / After dark (default Morning only). The phone only asks about notifications after "Turn on messages"
- New Settings screen (gear icon): city, companion moments (each one ticked is one message a day), usage stats on/off, privacy policy and terms (links coming), OpenStreetMap credit, version. Tapping the version 5 times shows "Reset onboarding" for testing
- City search now runs when you press Search instead of while you type, as OpenStreetMap's usage policy requires; results credit OpenStreetMap. "Use my location" rounds your position to about 1 km before looking up the town
- The app now identifies itself to OpenStreetMap ("SolarSymmetryApp" in its User-Agent)

### 1.6.2 (2026-11-21)
- Final app icon "Coast" (Phase 1b): sunrise with sunbeams over the sea and a Skåne-style rapeseed field, replacing "First light" (too pale and drab at home-screen size). New icon and launch screen on iPhone and Android, launch background cream `#fff6d8`
- Colours re-tuned to match: sky blue, sun gold, cream, sea blue, rapeseed yellow and green; headings in sea blue, body text `#1f2d4a`; buttons, the active tab and today's date are gold with dark text (all checked against WCAG AA). No purple, plum, pink or deep orange left
- Today card is a blue sky fading to warm cream and gold, the sun low on the horizon with soft beams, no stars; loading and pull-to-refresh screens use the same sky

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
