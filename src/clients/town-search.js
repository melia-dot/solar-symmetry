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
 * optional ", region or country" ("southport, us"). Biggest places first.
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
     * Up to `limit` places for what's typed (at least 2 letters), biggest first
     * @returns {Promise<Array>} same shape as GeocodingClient.searchLocations
     */
    async search(query, limit = 6) {
        const [placePart, ...rest] = String(query || '').split(',');
        const q = TownSearch.fold(placePart);
        if (q.length < 2) return [];
        await this.load();

        // ", England" / ", US": only places whose region or country starts with it
        const where = TownSearch.fold(rest.join(' '));
        const whereCountry = TownSearch.COUNTRY_ALIASES[where];
        const inPlace = (row) => {
            if (!where) return true;
            const f = row.split('\t');
            const region = f[2] === '' ? '' : this.regionKeys[f[2]];
            const country = this.countryKeys[f[3]];
            return region.startsWith(where) || country.startsWith(where)
                || (whereCountry !== undefined && country === whereCountry);
        };

        // The list is biggest first, so the first `limit` hits of each kind are
        // the biggest of that kind
        const starts = [];  // the name starts with what's typed
        const others = [];  // another name does ("göteborg" -> Gothenburg)
        const words = [];   // a later word in the name does ("york" -> New York)
        const wordStart = ` ${q}`;
        const otherStart = `|${q}`;
        for (let i = 0; i < this.names.length; i++) {
            const name = this.names[i];
            const list = name.startsWith(q) ? starts
                : this.others[i].includes(otherStart) ? others
                : name.includes(wordStart) ? words
                : null;
            if (!list || list.length >= limit || !inPlace(this.rows[i])) continue;
            list.push(this.toLocation(i));
            if (starts.length >= limit && others.length >= limit && words.length >= limit) break;
        }

        // A match on another name ranks as if the place were 20 times smaller:
        // "münch" puts Munich first, but "so" doesn't put Seoul ("Soul") first.
        // The exact name typed comes first ("york": York before New York City)
        const rank = (town) => {
            if (others.includes(town)) return town.population / 20;
            return town.population * (TownSearch.fold(town.name.split(',')[0]) === q ? 1000 : 1);
        };
        const ranked = starts.concat(others).sort((a, b) => rank(b) - rank(a)).concat(words);

        // "St Helens" and "St. Helens" in the same region: keep the biggest
        const seen = new Set();
        return ranked.filter((town) => {
            const same = TownSearch.fold(town.name);
            if (seen.has(same)) return false;
            seen.add(same);
            return true;
        }).slice(0, limit);
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
