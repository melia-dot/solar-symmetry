# Solar Symmetry: Native App Plan

Goal: ship Solar Symmetry to the Apple App Store and Google Play as a small
commercial app. Free core, one-time £1.99 unlock for the "Companion" features.
The web version (PWA on GitHub Pages) is **retired** (decided 2026-11-21): the native
apps are the product, and the website no longer has to keep working.

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
- Stop and ask the human at every step that needs their accounts, money, or a decision.
- The human is a product manager, not a developer: explain choices briefly in plain words.

## Decisions

1. Seller: **personal developer account** in Mikael's own name (decided 2026-11-20).
   No D-U-N-S needed.
2. Builds: **Mikael's own Mac (M4, 16 GB) with VS Code**; Xcode from the Mac App Store.
3. App ID / bundle identifier: **`com.solarsymmetry.app`** (decided 2026-11-20).
   Permanent once the app is in a store.
4. Name under the home-screen icon: **SolarSym** (decided 2026-11-21; was
   "SolarSymmetry", which iOS cuts off). The store listing name stays
   **"Solar Symmetry"** and is set separately in Phase 6.
5. Phase 1 testing: free Apple ID (app expires after 7 days on the iPhone; paid
   Apple Developer account needed by Phase 4/6) and the Android emulator (no
   Android phone yet; test on a real one before launch).
6. Phase 1 result (2026-11-20): verified on the human's iPhone SE and the iPhone 18 Pro
   simulator. **Android not tested yet** (deferred by the human; do before launch).
7. Phase 2 (decided 2026-11-20): onboarding + Settings in the **native app only**; the
   website stays as it is. Privacy policy / terms use a **`[CONTACT EMAIL]` placeholder**
   until the human chooses a public address.
8. Web version **retired** (decided 2026-11-21). No need to keep the website working
   or to put new features behind a platform check. Existing `isNativeApp()` checks
   can stay until there's a reason to remove them.
9. Privacy policy + terms: **a public Notion page in Mikael's name** (decided
   2026-11-21), not GitHub Pages.

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

The app icon is now **"Coast"** (chosen 2026-11-21): sunrise with sunbeams over the
sea, with a rapeseed field inspired by Skåne. It replaces "First light", which was too
pale and drab at home-screen size (and "First light" replaced "Warm water", which read
as a sunset). Everything must say morning/sunrise: no purple, plum, pink or deep
orange anywhere. Files and rationale: `design/app-icon/` (read its README). Let the
icon lead.

**1. Icon + launch screen + name**
- `design/app-icon/app-icon.svg` and `splash.svg` are the masters (supplied as
  `solarsym-icon.svg` / `solarsym-splash.svg`; the splash uses
  `preserveAspectRatio="xMidYMid slice"`). Render `app-icon-1024.png` (RGB, no
  transparency) and `splash-2732.png`, then regenerate native assets (check current
  `@capacitor/assets` docs). Android launch background: `#fff6d8`
- Launch screen should flow into the app, no white or grey flash
- Home-screen name **"SolarSym"** on iOS and Android (iOS cuts "SolarSymmetry" off).
  The store listing name stays **"Solar Symmetry"**

**2. Palette (taken from the icon)**
| Role | Hex |
|---|---|
| Sky blue | `#2f6fd6` |
| Sun gold | `#ffcf4a` |
| Cream | `#fff6d8` |
| Sea | `#4f93d8` → `#2a63b0` |
| Rapeseed yellow | `#ffd60a` |
| Green | `#6aa84f` / `#5e9e46` |
| Background | `#fbf6ef` |
| Body text | `#1f2d4a` |
| Headings | sea blue `#2a63b0` |
| Accent (buttons, active tab, today's date) | gold `#ffcf4a` with dark text `#1f2d4a` |

- Put these in CSS custom properties in one place; no hard-coded colours in components
- Small icons: from the palette, contrast checked (WCAG AA). No purple, plum, pink or
  deep orange

**3. Today card**
- Like the icon: blue sky at the top fading to warm cream/gold, the sun low with soft
  beams. No stars
- "Today" and "Same light on" tiles readable on it (contrast check)

**4. Month list + Compare Cities**
- Softer cards on the cream background; today's card highlighted in gold

**5. Loading / pull-to-refresh:** the same sky as the Today card.

**6. Evening mode:** moved to Phase 1c, after Phase 2 (decided 2026-11-21).

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
- **Privacy policy + terms:** a public Notion page in Mikael's name (decided), linked
  from Settings and the store listings. Draft the text; the human reviews it and
  publishes it in Notion, then gives us the link.

UK GDPR / PECR notes: consent must be active, optional and changeable. No pre-ticked
boxes, no "by using this app you agree". Check the ICO's current guidance on analytics
(rules changed recently). Not legal advice.

**Done when:** a fresh install walks through the 3 screens once; all choices can be
changed in Settings; analytics never runs without Yes.

## Phase 1c: Evening mode

Moved here from Phase 1b (decided 2026-11-21). Uses the Phase 1b colour tokens in
`src/styles/main.css`.

- After local sunset, switch to a dark warm theme (night/plum background, cream text)
- Also respect the phone's dark mode setting. Phase 1 locked the iOS app to light
  mode (`UIUserInterfaceStyle` in `ios/App/App/Info.plist`); undo that here
- Keep it calm and soft: no harsh contrast; check text contrast (WCAG AA)
- Bump the minor version; show before/after screenshots

**Done when:** the app turns warm and dark after sunset (and with phone dark mode on),
and back again in the morning, with readable text everywhere.

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
