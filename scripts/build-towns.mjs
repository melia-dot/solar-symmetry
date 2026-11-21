/**
 * Builds src/data/towns.json, the town list behind the search suggestions
 * (src/clients/town-search.js), from GeoNames (geonames.org, CC BY 4.0).
 *
 * Every populated place with 1,000+ people (~170k), with its region, country,
 * position (2 decimals, about 1 km) and population (for ranking). Cities of
 * 100,000+ also get their other Latin-script names, so "Göteborg" finds
 * Gothenburg and "München" finds Munich. Run it again
 * now and then to pick up GeoNames corrections; it isn't part of npm run sync.
 *
 * Download these three files from https://download.geonames.org/export/dump/
 * into one folder (unzip cities1000.zip), then:
 *
 *   node scripts/build-towns.mjs <that folder>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = process.argv[2];
if (!dir) {
    console.error('Usage: node scripts/build-towns.mjs <folder with cities1000.txt, admin1CodesASCII.txt, countryInfo.txt>');
    process.exit(1);
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lines = (file) => readFileSync(join(dir, file), 'utf8').split('\n').filter((l) => l && !l.startsWith('#'));

// Country code -> name ("GB" -> "United Kingdom")
const countryName = new Map(lines('countryInfo.txt').map((l) => {
    const f = l.split('\t');
    return [f[0], f[4]];
}));

// "GB.ENG" -> "England"
const regionName = new Map(lines('admin1CodesASCII.txt').map((l) => {
    const f = l.split('\t');
    return [f[0], f[1]];
}));

// Same folding as town-search.js, only to decide whether the ASCII name adds anything
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const LATIN = /^[\p{Script=Latin}\s'.\-]+$/u;

const countries = [];
const regions = [];
const index = (list, map, value) => {
    if (!value) return '';
    if (!map.has(value)) { map.set(value, list.length); list.push(value); }
    return map.get(value);
};
const countryIdx = new Map();
const regionIdx = new Map();

const towns = lines('cities1000.txt').map((l) => {
    const f = l.split('\t');
    const [name, ascii, lat, lng, cc, admin1, pop] = [f[1], f[2], f[4], f[5], f[8], f[10], Number(f[14]) || 0];
    // Other names to search by: the ASCII spelling, and for big cities their
    // names in other languages
    const known = new Set([fold(name)]);
    const alt = [];
    const add = (n) => { const k = fold(n); if (k && !known.has(k)) { known.add(k); alt.push(n.replace(/[\t|]/g, ' ')); } };
    add(ascii);
    if (pop >= 100000) {
        // Real names only: capitalised, Latin script, 1-2 words; no airport
        // codes ("CPH"), lower-case transliterations or long historical names
        f[3].split(',')
            .filter((n) => LATIN.test(n) && /^\p{Lu}/u.test(n) && !/^[A-Z]{2,4}$/.test(n) && n.trim().split(/\s+/).length <= 2)
            .forEach(add);
    }
    return { name, ascii: alt.join('|'), lat: (+lat).toFixed(2), lng: (+lng).toFixed(2), cc, region: regionName.get(`${cc}.${admin1}`) || '', pop };
});

// Biggest first, so the search can stop early and still rank by size
towns.sort((a, b) => b.pop - a.pop);

// One line per town: name, other names (|-separated), region #, country #, lat, lng, population in thousands
const rows = towns.map((t) => [
    t.name,
    t.ascii,
    index(regions, regionIdx, t.region),
    index(countries, countryIdx, countryName.get(t.cc) || t.cc),
    t.lat.replace(/\.?0+$/, ''),
    t.lng.replace(/\.?0+$/, ''),
    Math.round(t.pop / 1000),
].join('\t'));

const out = {
    source: 'GeoNames cities1000 (geonames.org, CC BY 4.0)',
    built: new Date().toISOString().slice(0, 10),
    countries,
    regions,
    towns: rows.join('\n'),
};
const file = join(root, 'src', 'data', 'towns.json');
writeFileSync(file, JSON.stringify(out));
console.log(`Wrote ${towns.length} towns, ${regions.length} regions, ${countries.length} countries to src/data/towns.json`);
