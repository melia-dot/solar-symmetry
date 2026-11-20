/**
 * Copies the web app into www/ for Capacitor (the native iOS/Android apps).
 *
 * The web app has no build step: GitHub Pages serves the files in the repo root
 * as they are. Capacitor needs them in a separate folder, so this script copies
 * them there. www/ is generated; don't edit it, edit the originals.
 *
 * Not copied: service-worker.js (the native app carries its files, so it needs
 * no offline cache; src/scripts/sw-update.js skips registration in the app),
 * and editor/backup clutter (.DS_Store, *.backup).
 *
 * Run: npm run build   (or npm run sync to also copy into the native projects)
 */
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'www');

const ENTRIES = ['index.html', 'manifest.json', 'icon.svg', 'src'];
const SKIP = (name) => name === '.DS_Store' || name.endsWith('.backup');

rmSync(out, { recursive: true, force: true });
mkdirSync(out);

for (const entry of ENTRIES) {
    cpSync(join(root, entry), join(out, entry), {
        recursive: true,
        filter: (src) => !SKIP(basename(src)),
    });
}

console.log(`Copied ${ENTRIES.join(', ')} to www/`);
