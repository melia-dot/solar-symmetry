# Phase 3 notes: companion notifications

**Status (2026-11-21):** analysis done, nothing built. Paused before any code
because the UX is being redone first. The 5 questions below are still open. When
Phase 3 restarts, check them against the new UX, get answers from Mikael, then
build.

Branch: `native-phase-3` (made from `main` at v1.8.1; holds only this file).
Plan: "Phase 3" in `docs/NATIVE_APP_PLAN.md`.

## What Phase 3 is

The app sends a short, friendly message once a day for each "moment" the user
switched on: **Morning** (around sunrise), **Before sunset** (~30 min before) and
**After dark**. Everything runs on the phone, with no server. The lines change
with the season (days getting shorter or longer), fill in real numbers (sunrise
time, minutes of light gained, and so on) and never feel robotic.

**Done when:** messages arrive on a real phone at the right local times with varied
lines, and changing the city or settings reschedules them.

## What already exists (built in Phase 2)

- **Choosing moments:** the welcome screens and Settings let the user switch
  moments on and off. They're saved as `AppSettings.get().moments` in
  `src/utils/settings.js`. The default is Morning only.
- **Permission:** `CompanionNotifications.status()` / `.request()` in the same file
  handle notification permission (Capacitor `LocalNotifications`). The phone only
  asks after the user taps "Turn on messages", or switches a moment on in Settings.
- **The lines:** `src/data/companion-messages.json` holds them. It has a `darkening`
  and a `brightening` set, each with morning / beforeSunset / afterDark lines, plus
  `milestones`.
  - Normal lines: darkening has 7 / 5 / 8, brightening has 6 / 5 / 5. That's only
    36 in total.
  - Milestones (1–2 lines each): shortest day, the day after it, longest day,
    spring and autumn equinox, clocks forward and back, first sunset after 5pm,
    one hour of light gained.
  - Placeholders: `{city} {sunrise} {sunset} {daylight} {daysToSolstice}
    {minutesGained} {minutesLost} {mirrorDate}`.
- **Sun times:** these are already calculated on the phone (`TwilightClient` with
  SunCalc, in the city's own time zone) and dates are handled by
  `DateCalculations`. Phase 3 needs no new data source.

## Decisions I'd make without asking (say if any are wrong)

- **How far ahead:**
  - Schedule the next **14 days**. With all 3 moments on, that's 42 messages
    waiting.
  - iOS keeps at most about 64 waiting messages per app (check Apple's current
    docs at build time), so this stays well under the limit.
- **When to reschedule:** clear everything and schedule again each time:
  - the app opens or comes back to the foreground,
  - the city changes,
  - a moment is switched on or off.
  
  If the app isn't opened for 14 days, messages stop. That's acceptable for v1; a
  background refresh could come later.
- **Season:** "darkening" runs from the longest day to the shortest day, and
  "brightening" is the rest of the year. Which is which flips in the southern
  hemisphere, using the city's latitude.
- **Clock changes:** spotted by comparing the city's time-zone offset on the day
  before and the day itself (the time-zone lookup is already in the app).
- **Repeats:** no line repeats within 14 days, per moment and season. Line history
  is saved on the phone so the rule still holds across reschedules.
- **Permission:** no messages are scheduled unless permission is granted, and all
  of them are cleared if the user switches every moment off.
- **Tapping a message** just opens the app (no special screen in v1).

## Open questions (with suggested answers)

1. **Free vs paid.** Buying the app (Phase 5) doesn't exist yet.
   *Suggested:* everyone gets every moment they switch on for now. The free limit
   (the plan suggests 1 message a week) is added in Phase 5.

2. **Send times.** In summer, sunrise in Southport is about 04:40 and darkness
   comes about 23:00, so raw sun times would wake people up or come too late.
   *Suggested limits:*

   | Moment | Sent at | Never before | Never after |
   |---|---|---|---|
   | Morning | sunrise | 07:00 | 09:30 |
   | Before sunset | 30 min before sunset | 15:00 | 21:00 |
   | After dark | "Dark by" time (civil dusk) | 17:30 | 21:30 |

   Each time moves randomly by up to ±10 minutes so it doesn't feel robotic.

3. **More lines.** With 5–8 lines per moment and season, daily messages can't keep
   the "no repeat within 14 days" rule.
   *Suggested:* Claude drafts about 20 per moment per season (about 120 new lines)
   in the same warm "buddy" voice, and Mikael approves or edits them before they
   go in. Or Mikael writes them.

4. **Milestone days.** Does the milestone line replace every message that day, or
   just one?
   *Suggested:* it replaces the first moment the user has switched on that day,
   and the others stay normal.

5. **Testing.**
   *Suggested:*
   - A hidden "Send test messages" button next to "Reset onboarding" (Settings →
     tap the version 5 times). It sends each kind of message within a minute, so
     testing doesn't take a day.
   - iPhone only for this phase. Android is checked on the emulator before launch,
     as in Phases 1 and 2.

## Things to watch

- **The UX redo may change this phase:** for example how moments are presented,
  the wording on the welcome screens, or what tapping a message should open.
  Re-read this file against the new UX before building.
- **Phase order:** the plan put Phase 1c (evening mode) before Phase 3. That's
  still undecided.
- **Times:** messages must use the **city's** time zone, not the phone's, in case
  they differ (e.g. someone travelling).
- **Milestone lines:** "first sunset after 5pm" must use the same rule as the
  "Light returns after work" tile (sunset shown as 17:01 or later), so the two
  always agree.
- **Phase 3b:** images in messages and the "Share my winter" card come after
  Phase 3 and are not part of it.
