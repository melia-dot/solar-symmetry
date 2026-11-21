/**
 * Geocoding API Client
 * City search and "Use my location" via OpenStreetMap Nominatim.
 *
 * Nominatim usage policy (operations.osmfoundation.org/policies/nominatim/,
 * checked 2026-11-21), which this follows:
 * - Searches only when the user asks (Enter / Search key). Search-as-you-type
 *   ("auto-complete") is not allowed, so there is no debounce-on-input here.
 * - At most 1 request a second for the whole app: one request per user action,
 *   and repeated searches come from the cache.
 * - The app identifies itself: capacitor.config.json appends
 *   "SolarSymmetryApp (com.solarsymmetry.app)" to the WebView's User-Agent
 *   (a User-Agent header set in fetch() is ignored by WebViews).
 * - Results are credited to OpenStreetMap (GeocodingClient.ATTRIBUTION),
 *   shown under the search results and in Settings.
 * - No personal data: "Use my location" rounds the position to about 1 km
 *   before sending it, and only that rounded position is saved.
 */

class GeocodingClient {
    constructor() {
        this.baseUrl = 'https://nominatim.openstreetmap.org';
        this.cache = new Map();
    }

    /**
     * Search for locations based on query string
     * @param {string} query - Search query (city name, address, etc.)
     * @returns {Promise<Array>} - Array of location results
     */
    async searchLocations(query) {
        if (!query || query.trim().length < 2) {
            return [];
        }

        // Check cache first
        const cacheKey = query.toLowerCase().trim();
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const url = new URL('/search', this.baseUrl);
            url.searchParams.set('q', query.trim());
            url.searchParams.set('format', 'json');
            url.searchParams.set('limit', '5');
            url.searchParams.set('addressdetails', '1');
            url.searchParams.set('extratags', '1');

            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Transform the data into our format
            const locations = data.map(item => ({
                id: item.place_id,
                name: this.formatLocationName(item),
                displayName: item.display_name,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                type: item.type,
                importance: item.importance || 0
            }));

            // Sort by importance (higher is better)
            locations.sort((a, b) => b.importance - a.importance);

            // Cache the results
            this.cache.set(cacheKey, locations);

            return locations;
        } catch (error) {
            console.error('Geocoding search failed:', error);
            return [];
        }
    }

    /**
     * Format location name for display
     * @param {Object} item - Raw geocoding result
     * @returns {string} - Formatted location name
     */
    formatLocationName(item) {
        const address = item.address || {};

        // Try to build a nice display name
        const parts = [];

        // The most local place name. OpenStreetMap often puts the council
        // district in "city" (Southport is town "Southport", city "Sefton"), so
        // the place itself comes first, then the smallest settlement type.
        const place = GeocodingClient.PLACE_TYPES.includes(item.addresstype) && item.name;
        const local = place || address.hamlet || address.village || address.town
            || address.city || address.municipality;
        if (local) {
            parts.push(local);
        }

        // Add state/region
        if (address.state) {
            parts.push(address.state);
        } else if (address.region) {
            parts.push(address.region);
        }

        // Add country
        if (address.country) {
            parts.push(address.country);
        }

        // If we couldn't build a good name, fall back to display_name
        if (parts.length === 0) {
            return (item.display_name || '').split(',').slice(0, 3).join(', ');
        }

        return parts.join(', ');
    }

    /**
     * Reverse geocoding: town name for a position. Asks for town level only
     * (zoom 12), so no street address is ever looked up.
     * @returns {Promise<string|null>} - Location name, or null if it failed
     */
    async reverseGeocode(lat, lng) {
        try {
            const url = new URL('/reverse', this.baseUrl);
            url.searchParams.set('lat', lat.toString());
            url.searchParams.set('lon', lng.toString());
            url.searchParams.set('format', 'json');
            url.searchParams.set('addressdetails', '1');
            url.searchParams.set('zoom', '12'); // town level (10 gives the council district)

            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.error) throw new Error(data.error);
            return this.formatLocationName(data) || null;
        } catch (error) {
            console.error('Reverse geocoding failed:', error);
            return null;
        }
    }

    /**
     * Clear the search cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * "Use my location": asks for location permission (only now, because the
     * user tapped the button), reads the position once, rounds it to about
     * 1 km and looks up the town name.
     *
     * Throws an Error whose .reason is 'denied', 'off', 'timeout' or 'failed',
     * so the screen can explain what happened in plain words.
     * @returns {Promise<{id, name, displayName, lat, lng, type}>}
     */
    async getCurrentLocation() {
        const position = await this.readPosition();

        // ~1.1 km: plenty for sunrise/sunset times, never a precise address
        const lat = Math.round(position.lat * 100) / 100;
        const lng = Math.round(position.lng * 100) / 100;

        const name = await this.reverseGeocode(lat, lng) || 'My location';
        return {
            id: `here:${lat},${lng}`,
            name,
            displayName: name,
            lat,
            lng,
            type: 'myLocation'
        };
    }

    /** One position reading: the native plugin in the app, the browser API on the web */
    async readPosition() {
        const fail = (reason, cause) => {
            const error = new Error(`Location unavailable (${reason})`);
            error.reason = reason;
            error.cause = cause;
            return error;
        };

        const Geolocation = await nativePlugin('Geolocation');
        if (Geolocation) {
            try {
                let status = await Geolocation.checkPermissions();
                if (status.location !== 'granted' && status.location !== 'denied') {
                    status = await Geolocation.requestPermissions();
                }
                if (status.location === 'denied') throw fail('denied');

                const position = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: false, // town level is enough, and faster
                    timeout: 15000,
                    maximumAge: 5 * 60 * 1000
                });
                return { lat: position.coords.latitude, lng: position.coords.longitude };
            } catch (error) {
                if (error.reason) throw error;
                // Plugin error codes (Capacitor Geolocation docs)
                const code = String(error.code || '');
                const message = String(error.message || '');
                if (/GLOC-000[38]/.test(code) || /denied|restricted/i.test(message)) throw fail('denied', error);
                if (/GLOC-0007/.test(code) || /not enabled|disabled/i.test(message)) throw fail('off', error);
                if (/GLOC-0010/.test(code) || /time/i.test(message)) throw fail('timeout', error);
                throw fail('failed', error);
            }
        }

        if (!navigator.geolocation) throw fail('failed');
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
                (error) => reject(fail(
                    error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'failed', error)),
                { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60 * 1000 }
            );
        });
    }
}

/** Result types that are a place people live in (Nominatim "addresstype") */
GeocodingClient.PLACE_TYPES = ['city', 'town', 'village', 'hamlet', 'suburb', 'quarter',
    'neighbourhood', 'borough', 'municipality', 'island'];

/** OpenStreetMap credit, required wherever search results are shown */
GeocodingClient.ATTRIBUTION = 'Search by © OpenStreetMap contributors';
GeocodingClient.ATTRIBUTION_URL = 'https://www.openstreetmap.org/copyright';

/** Plain-words explanation for a getCurrentLocation() failure */
GeocodingClient.locationErrorText = (error) => ({
    denied: 'SolarSym isn’t allowed to use your location. You can search for your city instead, or allow location in your phone’s Settings.',
    off: 'Location is turned off on this phone. You can search for your city instead.',
    timeout: 'Couldn’t find your location in time. Try again, or search for your city.',
}[error && error.reason] || 'Couldn’t find your location. Please search for your city instead.');

// Export for use in other modules
window.GeocodingClient = GeocodingClient;
