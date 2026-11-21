/**
 * Town suggestions while typing, from a town list inside the app
 * (src/data/towns.json: every place with 1,000+ people, from GeoNames, CC BY 4.0;
 * rebuilt with scripts/build-towns.mjs).
 *
 * OpenStreetMap's search doesn't allow search-as-you-type, so suggestions come
 * from this list instead: instant, offline, and nothing typed leaves the phone.
 * Smaller places not in the list are still found by pressing Search, which asks
 * OpenStreetMap (src/clients/geocoding.js).
 *
 *   const towns = new TownSearch();
 *   towns.load();                         // optional head start; search() waits for it
 *   const list = await towns.search('South'); // [{ name: 'Southport, England, United Kingdom', lat, lng, ... }]
 *
 * Matching ignores case, accents and punctuation ("malmo" finds Malmö,
 * "st helens" finds St. Helens), knows big cities' other names ("göteborg"
 * finds Gothenburg), matches the start of the name or of any word
 * in it ("york" finds New York, after names starting with York), and takes an
 * optional ", region or country" ("southport, us"). Places in the user's own
 * country come first, then the rest of the world, biggest first.
 */
class TownSearch {
    constructor(url = 'src/data/towns.json') {
        this.url = url;
        this.loading = null;
    }

    /** Loads and indexes the list once; later calls return the same promise */
    load() {
        if (!this.loading) {
            this.loading = fetch(this.url)
                .then((response) => {
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return response.json();
                })
                .then((data) => this.index(data))
                .catch((error) => {
                    console.warn('[towns] town list failed to load:', error);
                    this.loading = null; // try again on the next search
                    throw error;
                });
        }
        return this.loading;
    }

    index(data) {
        this.countries = data.countries;
        this.regions = data.regions;
        this.countryKeys = data.countries.map(TownSearch.fold);
        this.regionKeys = data.regions.map(TownSearch.fold);
        const rows = data.towns.split('\n');
        this.rows = rows;
        // Search keys, folded: the name, and "|other|names|" (big cities only)
        this.names = new Array(rows.length);
        this.others = new Array(rows.length);
        for (let i = 0; i < rows.length; i++) {
            const tab1 = rows[i].indexOf('\t');
            const tab2 = rows[i].indexOf('\t', tab1 + 1);
            const other = rows[i].slice(tab1 + 1, tab2);
            this.names[i] = TownSearch.fold(rows[i].slice(0, tab1));
            this.others[i] = other ? `|${other.split('|').map(TownSearch.fold).join('|')}` : '';
        }
    }

    /**
     * Up to `limit` places for what's typed (at least 2 letters)
     *
     * Order: places with exactly the name typed; then places in the user's own
     * country (from `near`, the saved city, else the phone's region setting);
     * then the rest of the world. Bigger places first within each group. The
     * last slot is kept for the biggest match abroad, so "lon" in the US still
     * shows London.
     *
     * @param {Object} [options]
     * @param {Object} [options.near] - the user's saved city ({ name: 'Southport, England, United Kingdom' })
     * @returns {Promise<Array>} same shape as GeocodingClient.searchLocations
     */
    async search(query, { near = null, limit = 6 } = {}) {
        const [placePart, ...rest] = String(query || '').split(',');
        const q = TownSearch.fold(placePart);
        if (q.length < 2) return [];
        await this.load();

        // ", England" / ", US": only places whose region or country starts with it
        const where = TownSearch.fold(rest.join(' '));
        const whereCountry = TownSearch.COUNTRY_ALIASES[where];
        const inPlace = (fields) => {
            if (!where) return true;
            const region = fields[2] === '' ? '' : this.regionKeys[fields[2]];
            const country = this.countryKeys[fields[3]];
            return region.startsWith(where) || country.startsWith(where)
                || (whereCountry !== undefined && country === whereCountry);
        };
        const home = this.countryKeys.indexOf(TownSearch.fold(TownSearch.homeCountry(near)));

        // The list is biggest first, so the first `limit` hits of each kind are
        // the biggest of that kind. Kinds: the name starts with what's typed;
        // another (local) name does ("göteborg" -> Gothenburg); a later word in
        // the name does ("york" -> New York). Each at home and abroad.
        const found = { start: [[], []], other: [[], []], word: [[], []] };
        const wordStart = ` ${q}`;
        const otherStart = `|${q}`;
        for (let i = 0; i < this.names.length; i++) {
            const name = this.names[i];
            const kind = name.startsWith(q) ? 'start'
                : this.others[i].includes(otherStart) ? 'other'
                : name.includes(wordStart) ? 'word'
                : null;
            if (!kind) continue;
            const fields = this.rows[i].split('\t');
            const atHome = Number(fields[3]) === home ? 0 : 1;
            const list = found[kind][atHome];
            if (list.length >= limit || !inPlace(fields)) continue;
            const town = this.toLocation(i);
            town.exact = name === q;
            town.viaOtherName = kind === 'other';
            list.push(town);
        }

        // A match on another name ranks as if the place were 20 times smaller:
        // "münch" puts Munich first, but "so" doesn't put Seoul first
        const rank = (town) => town.population / (town.viaOtherName ? 20 : 1);
        const group = (side) => found.start[side].concat(found.other[side])
            .sort((a, b) => rank(b) - rank(a))
            .concat(found.word[side]);
        const atHome = group(0);
        const abroad = group(1);
        const exact = atHome.concat(abroad).filter((town) => town.exact);
        const homeRest = atHome.filter((town) => !town.exact);
        const abroadRest = abroad.filter((town) => !town.exact);
        const homeSlots = abroadRest.length > 0 ? limit - 1 : limit;
        const ordered = exact.concat(homeRest.slice(0, Math.max(0, homeSlots - exact.length)), abroadRest, homeRest);

        // "St Helens" and "St. Helens" in the same region: keep the biggest
        const seen = new Set();
        return ordered.filter((town) => {
            const same = TownSearch.fold(town.name);
            if (seen.has(same)) return false;
            seen.add(same);
            delete town.exact;
            delete town.viaOtherName;
            return true;
        }).slice(0, limit);
    }

    /**
     * The user's country name: from their saved city ("…, United Kingdom"),
     * else from the phone's region setting (en-GB -> United Kingdom), else null
     */
    static homeCountry(near) {
        if (near && near.name && near.name.includes(',')) {
            return near.name.slice(near.name.lastIndexOf(',') + 1).trim();
        }
        try {
            const region = new Intl.Locale(navigator.language).maximize().region;
            return region ? new Intl.DisplayNames(['en'], { type: 'region' }).of(region) : null;
        } catch (error) {
            return null;
        }
    }

    toLocation(i) {
        const [name, , region, country, lat, lng, popK] = this.rows[i].split('\t');
        const parts = [name];
        if (region !== '') parts.push(this.regions[region]);
        parts.push(this.countries[country]);
        return {
            id: `gn-${i}`,
            name: parts.join(', '),
            displayName: parts.join(', '),
            lat: Number(lat),
            lng: Number(lng),
            type: 'town',
            population: Number(popK) * 1000,
        };
    }

    /** Lower case, no accents, no punctuation: "St. Helens" -> "st helens" */
    static fold(text) {
        return String(text || '')
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/œ/g, 'oe').replace(/ß/g, 'ss')
            .replace(/ł/g, 'l').replace(/đ/g, 'd').replace(/þ/g, 'th').replace(/ı/g, 'i')
            .replace(/[.'’`]/g, '')
            .replace(/[-‐–—_/]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
}

// Common short forms people type after a comma
TownSearch.COUNTRY_ALIASES = {
    uk: 'united kingdom',
    gb: 'united kingdom',
    us: 'united states',
    usa: 'united states',
    uae: 'united arab emirates',
};

TownSearch.ATTRIBUTION = 'Town list by GeoNames (CC BY 4.0)';
TownSearch.ATTRIBUTION_URL = 'https://www.geonames.org/';

// One list for the whole app (search boxes, welcome screens, Settings)
TownSearch.shared = new TownSearch();

window.TownSearch = TownSearch;
