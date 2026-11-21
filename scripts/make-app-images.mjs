/**
 * Renders the "First light" app icon and launch screen (design/app-icon/*.svg,
 * the master artwork) into the PNGs the stores and @capacitor/assets need.
 *
 *   design/app-icon/app-icon-1024.png   App Store icon: RGB, no transparency
 *   design/app-icon/splash-2732.png     launch screen, full bleed
 *   assets/icon-only.png                iOS icon (+ Android legacy icons)
 *   assets/icon-background.png          Android adaptive icon: the whole scene
 *   assets/icon-foreground.png          Android adaptive icon: empty (the scene
 *                                       has no separate foreground)
 *   assets/splash.png, splash-dark.png  launch screen (same scene in dark mode)
 *
 * Then run `npx @capacitor/assets generate ...` (see README) to produce every
 * size iOS and Android need.
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const design = join(root, 'design', 'app-icon');
const assets = join(root, 'assets');
mkdirSync(assets, { recursive: true });

const iconSvg = readFileSync(join(design, 'app-icon.svg'));
const splashSvg = readFileSync(join(design, 'splash.svg'));

// SVG → PNG at an exact size, flattened (no alpha channel: Apple rejects icons with one)
async function render(svg, size, out) {
    await sharp(svg, { density: 72 * size / 1024 })
        .resize(size, size)
        .flatten({ background: '#fff0d6' })
        .removeAlpha()
        .png()
        .toFile(out);
    console.log(out.replace(root + '/', ''));
}

await render(iconSvg, 1024, join(design, 'app-icon-1024.png'));
await render(splashSvg, 2732, join(design, 'splash-2732.png'));

await render(iconSvg, 1024, join(assets, 'icon-only.png'));
await render(iconSvg, 1024, join(assets, 'icon-background.png'));
await render(splashSvg, 2732, join(assets, 'splash.png'));
await render(splashSvg, 2732, join(assets, 'splash-dark.png'));

await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .png()
    .toFile(join(assets, 'icon-foreground.png'));
console.log('assets/icon-foreground.png');
