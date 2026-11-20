/**
 * Draws the source images for the native app icon and splash screen into assets/,
 * using the sun from icon.svg (white sun on indigo).
 *
 * Then `npx @capacitor/assets generate` turns them into every size iOS and
 * Android need (see "npm run app-images" in package.json).
 *
 *   icon-only.png        1024  iOS icon: full square, no transparency (Apple rejects it)
 *   icon-foreground.png  1024  Android adaptive icon, sun layer (transparent)
 *   icon-background.png  1024  Android adaptive icon, colour layer
 *   splash.png           2732  launch screen (splash-dark.png: same, for dark mode)
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'assets');
mkdirSync(out, { recursive: true });

const INDIGO = '#4338ca';

// The sun from icon.svg (drawn around 256,256 in a 512 box)
const SUN = `
  <circle cx="256" cy="256" r="120" fill="#ffffff"/>
  <g stroke="#ffffff" stroke-width="24" stroke-linecap="round">
    <path d="M256 40 V120"/><path d="M256 392 V472"/>
    <path d="M472 256 H392"/><path d="M120 256 H40"/>
    <path d="M403 109 L347 165"/><path d="M165 347 L109 403"/>
    <path d="M403 403 L347 347"/><path d="M165 165 L109 109"/>
  </g>`;

// size = image width/height; sunScale = sun size relative to icon.svg; bg = colour or null
function svg(size, sunScale, bg) {
    const c = size / 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}
  <g transform="translate(${c} ${c}) scale(${sunScale}) translate(-256 -256)">${SUN}</g>
</svg>`;
}

const images = {
    // Rays reach ~67% of the width: clear of the iOS rounded corners
    'icon-only.png': svg(1024, 1.5, INDIGO),
    // Android: @capacitor/assets insets this layer by 16.7%, so the image already
    // maps to the visible part of the adaptive icon; same sun size as on iOS
    'icon-foreground.png': svg(1024, 1.5, null),
    'icon-background.png': svg(1024, 0, INDIGO),
    'splash.png': svg(2732, 1.6, INDIGO),
    'splash-dark.png': svg(2732, 1.6, INDIGO),
};

for (const [name, source] of Object.entries(images)) {
    await sharp(Buffer.from(source)).png().toFile(join(out, name));
    console.log(`assets/${name}`);
}
