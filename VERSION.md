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
