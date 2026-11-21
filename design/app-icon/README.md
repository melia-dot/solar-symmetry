# App icon: "First light" (chosen 2026-11-21)

A pale dawn sky over calm water: dawn blue at the top with two faint stars, then
lavender, pink and peach, and a glowing sun at the horizon with its reflection on
the water. Everything says morning: the light is coming back.

It replaces **"Warm water"** (chosen 2026-11-20), which looked like a sunset on the
home screen. The app is about light returning, so the icon (and the app's colours)
must say sunrise, with no dark violet, plum or deep orange.

Palette: dawn blue `#3d5a92`, lavender `#8f97c9`, dawn pink `#e9b3bf`, peach
`#ffd3a6`, cream `#fff0d6`, water `#c9a9bf` → `#6f7fae`.

- `app-icon.svg`: master artwork (1024×1024)
- `app-icon-1024.png`: App Store / source icon, RGB, no transparency
- `splash.svg` / `splash-2732.png`: launch screen, the same artwork with
  `preserveAspectRatio="xMidYMid slice"` (full-bleed, centre-cropped on phones)

For Capacitor: `node scripts/make-app-images.mjs`, then `@capacitor/assets` with a
cream `#fff0d6` background (exact command in the main README). The web `icon.svg`
is not used any more (web version retired).
