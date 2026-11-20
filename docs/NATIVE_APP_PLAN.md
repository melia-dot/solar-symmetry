# Solar Symmetry: Native App Plan

Goal: ship Solar Symmetry to the Apple App Store and Google Play as a small
commercial app. Free core, one-time £1.99 unlock for the "Companion" features.
The web PWA (GitHub Pages) must keep working throughout.

## Where we are (v1.4.0)

- Static web app: HTML/CSS/vanilla JS, no build step, deployed from `main` to GitHub Pages
- Sun times calculated on the device (SunCalc, `src/vendor/suncalc.js`); time zones
  via `src/vendor/tz-lookup.js`. No sun API, works offline.
- Only network call: city search (OpenStreetMap Nominatim, `src/clients/geocoding.js`)
- Today hero at the top of the Symmetry view (today vs. its mirror date)
- Companion message library drafted: `src/data/companion-messages.json`

## Ground rules

- Follow `CLAUDE.md` (bump `src/version.js`, add a `VERSION.md` entry, version in commit message)
- Never invent plugin names, method names or API syntax. Check the current docs
  (Capacitor, plugin READMEs, Firebase, Apple, Google) before using anything, and
  say so if unsure.
- Work on a branch per phase. Don't push to `main` without asking: `main` deploys live.
- The web build must keep working. Native-only features go behind a platform check
  (`Capacitor.isNativePlatform()` or equivalent; verify in current docs).
- Stop and ask the human at every step that needs their accounts, money, or a decision.
- The human is a product manager, not a developer: explain choices briefly in plain words.

## Decisions

1. Seller: **personal developer account** in Mikael's own name (decided 2026-11-20).
   No D-U-N-S needed.
2. Builds: **Mikael's own Mac (M4, 16 GB) with VS Code**; Xcode from the Mac App Store.
3. Still open, ask before Phase 1: App ID / bundle identifier
   (e.g. `com.<something>.solarsymmetry`)

## Phase 1: Native shell (Capacitor)

- Add Capacitor to the project with the existing web files as the web dir.
  Probably needs a small `package.json` and a copy step into a `www/` folder,
  because the app currently has no build. Keep it minimal.
- Add iOS and Android platforms
- App icon and splash screen (from `icon.svg`), safe areas (notch, home bar)
- Status bar styling to match the dark hero
- Runs on the human's own iPhone and Android device
- Remove or hide the "Mobile App" install-instructions tab inside the native app

**Done when:** the app runs on a real iPhone and a real Android phone, looks right,
works offline.

## Phase 1b: New icon + visual refresh (do next, before Phase 2)

The app icon is now **"Warm water"** (night sky → sunrise over warm water).
Files and rationale: `design/app-icon/` (read its README). The app's current
orange/charcoal-on-white look no longer matches it. Let the icon lead.

**1. Icon + launch screen**
- Replace the Phase 1 indigo icon and splash with `design/app-icon/app-icon-1024.png`
  and `design/app-icon/splash-2732.png`; regenerate native assets (check current
  `@capacitor/assets` docs)
- Launch screen should flow into the Today card (same colours), no white flash

**2. Palette (taken from the icon)**
| Role | Hex |
|---|---|
| Night (top of sky) | `#121226` |
| Dusk violet | `#2a2342` |
| Dusk plum | `#6b3a55` |
| Sunrise coral | `#e2704a` |
| Amber (new accent, replaces `#ff9500`) | `#ffb46a` |
| Warm cream (sun glow) | `#ffd7a0` / `#fff2d8` |
| Warm water | `#9a5a4c` → `#5a3a40` |

- Put these in CSS custom properties in one place; replace hard-coded oranges
- Background: warm cream (e.g. `#fbf6ef`) instead of cold white/grey
- Buttons, active tab, highlights: amber / coral, with text contrast checked (WCAG AA)

**3. Today card**
- Same night-to-sunrise gradient as the icon (night top → amber/cream at the bottom),
  optional faint stars at the top
- "Today" and "Same light on" tiles readable on it (contrast check)

**4. Month list + Compare Cities**
- Softer cards on the cream background; today's card highlighted in amber, not orange

**5. Evening mode (nice to have)**
- After local sunset, switch to a dark warm theme (night/plum background, cream text).
  Also respect the phone's dark mode setting. Ask the human before building if unsure.

**Ground rules:** CSS-first, no new libraries; keep it calm and soft (the audience
dislikes winter darkness and may be anxious: no harsh contrast, no alarming reds).
Bump the minor version. Show before/after screenshots (iPhone simulator) to the human.

**Done when:** icon + launch screen are the new artwork on the phone, and the app's
colours clearly belong to the same family as the icon.

## Phase 2: Onboarding, consent, settings

Shown once on first launch; answers stored on the device. Add a hidden
"Reset onboarding" option in Settings for testing.

- **Screen 1, Welcome:** one line on what the app does, then pick a city (search) or
  "Use my location" (needs location permission; only ask if they tap it)
- **Screen 2, Analytics consent:** "Help improve Solar Symmetry by sharing anonymous
  usage stats?" Yes / No with equal weight. Analytics stays off unless Yes.
- **Screen 3, Companion:** explain the daily buddy messages, preview one, then trigger
  the OS notification permission prompt. Never fire the OS prompt cold.
- **Settings screen:** city, notification time, messages per day (0–3, default 1),
  analytics on/off, privacy policy, terms, restore purchase, app version
- **Privacy policy + terms:** simple pages on GitHub Pages, linked from Settings and
  the store listings. Draft them; the human reviews.

UK GDPR / PECR notes: consent must be active, optional and changeable. No pre-ticked
boxes, no "by using this app you agree". Check the ICO's current guidance on analytics
(rules changed recently). Not legal advice.

**Done when:** a fresh install walks through the 3 screens once; all choices can be
changed in Settings; analytics never runs without Yes.

## Phase 3: Companion notifications (on device, no backend)

The heart of the product: a randomised "buddy", not a robot.

- Source: `src/data/companion-messages.json` (later overridable from Remote Config)
- Seasons: `darkening` (summer solstice → winter solstice) / `brightening` (the rest).
  Mind the southern hemisphere: base it on the user's latitude.
- Moments: `morning` (around sunrise), `beforeSunset` (~30 min before), `afterDark`
- Placeholders: `{city} {sunrise} {sunset} {daylight} {daysToSolstice}
  {minutesGained} {minutesLost} {mirrorDate}`, all computed on the device with the
  existing TwilightClient / DateCalculations
- Milestones replace the normal line on their day: solstices, day after winter
  solstice, equinoxes, clocks forward/back (detect from the city's time zone),
  first sunset after 5pm, one hour gained since the winter solstice
- Randomness rules: random moment + random line, no repeated line within 14 days,
  jitter send time by a few minutes, respect messages-per-day setting
- Scheduling: local notifications for the next ~2–3 weeks, rescheduled every time the
  app opens or the city changes. iOS limits pending local notifications (about 64;
  verify), so stay well under it.
- Free vs paid: decide with the human. Suggestion: free users get 1 message a week
  as a taster; unlock gives the daily buddy.

**Done when:** notifications arrive on real devices with correct local times and
varied lines; changing city or settings reschedules them.

## Phase 3b: Cosy images + "Share my winter" card

**Images in notifications (no backend)**
- Curated set of ~30–60 images bundled in the app: fireplaces, candles, steaming
  mugs, frosty windows, first spring sunrises, summer golden hour
- Our own AI-generated images (generated once, curated by the human, bundled), or
  properly licensed photos. No unlicensed stock, no live per-user generation.
- Tag each image with moment + season so it matches the line (candles → afterDark,
  sunrise → morning). Attach as a notification image on iOS and Android (check
  current docs for local-notification attachments on both platforms).
- Later: extra images via Remote Config (download, cache, then attach)

**"Share my winter" card (no backend, nothing to moderate)**
- User takes or picks a cosy photo; the app overlays a branded caption, e.g.
  "Southport · 31 days until the light turns · Solar Symmetry"
- Opens the native share sheet (Instagram, WhatsApp, etc.). The photo never leaves
  the device except through the user's own share.
- Strip location metadata from the exported image
- Analytics event (with consent): share_card_created

**Explicitly NOT in v1: an in-app community feed of user photos.** That needs a
backend, moderation, report/block tools (App Store Review Guidelines on
user-generated content), UK Online Safety Act duties and privacy handling. Revisit
as v2 if the share card shows real traction.

**Done when:** notifications show matching images on both platforms; a share card
can be created and shared from a real phone.

## Phase 4: Firebase

Ask the human to create the Firebase project and the Apple push key (APNs .p8) and
upload it to Firebase. Check current docs for the Capacitor Firebase plugins.

- Analytics: only initialised after consent. Key events: onboarding_complete,
  city_selected, notification_opt_in, paywall_view, unlock_purchased, app_open
- Remote Config: companion message library + feature flags + paywall copy
- Cloud Messaging: campaign pushes ("Solstice tonight") sent from the Firebase console

**Done when:** events show in the Firebase console, a Remote Config change updates
messages without an app release, and a test push arrives on both platforms.

## Phase 5: £1.99 one-time unlock

- One non-consumable product per store (same product ID on both, e.g.
  `companion_unlock`); the human creates it in App Store Connect and Play Console
- Purchase plugin for Capacitor (research current options; RevenueCat not needed for
  a single non-consumable but is an option)
- Paywall screen: what you get, price from the store (never hard-code it), Restore
  purchase
- Unlock flag stored on the device and re-checked with the store on launch
- Optional: Apple allows a free time-limited trial on one-time unlocks via a £0
  in-app item; verify current App Store Review Guidelines first

**Done when:** sandbox purchase and restore work on both platforms.

## Phase 6: Store launch

- Store listing: name, subtitle, description, keywords, screenshots (6.7" and 5.5"
  iPhone, Android phone), app preview optional
- Apple privacy label; Google Play Data safety form
- Age rating questionnaires
- TestFlight beta and Google Play internal testing, then submit
- Review notes for Apple: explain the native features (notifications, offline maths)
  so it's not seen as "just a website"

## Phase 7: After launch

- Dashboard: downloads, day-1/day-7 retention, notification opt-in rate, paywall
  views, unlock conversion, revenue
- Seasonal plan: most revenue expected October–February; summer = golden hour /
  long evenings mode
