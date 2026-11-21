# App icon: "Coast" (chosen 2026-11-21)

Sunrise with sunbeams over the sea: a blue sky with soft cream beams, a golden sun
half above a blue sea, and a yellow rapeseed field in the bottom right, inspired
by Skåne. Bright and hopeful: the light is coming back.

It replaces **"First light"** (chosen earlier on 2026-11-21), which was too pale and
drab at home-screen size. ("First light" itself replaced "Warm water", which looked
like a sunset.)

Palette: sky blue `#2f6fd6`, sun gold `#ffcf4a`, cream `#fff6d8`, sea `#4f93d8` →
`#2a63b0`, rapeseed yellow `#ffd60a`, green `#6aa84f` / `#5e9e46`.

- `app-icon.svg`: master artwork (1024×1024)
- `app-icon-1024.png`: App Store / source icon, RGB, no transparency
- `splash.svg` / `splash-2732.png`: launch screen, the same artwork with
  `preserveAspectRatio="xMidYMid slice"` (full-bleed, centre-cropped on phones)

For Capacitor: `node scripts/make-app-images.mjs`, then `@capacitor/assets` with a
cream `#fff6d8` background (exact command in the main README). The web `icon.svg`
is not used any more (web version retired).
