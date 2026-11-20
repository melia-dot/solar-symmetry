/**
 * Twilight Client
 * Calculates dawn, sunrise, sunset, dusk and golden hour on the device.
 * No network: uses SunCalc (src/vendor/suncalc.js) for the sun maths and
 * tz-lookup (src/vendor/tz-lookup.js) to find the city's time zone.
 *
 * The async methods keep the same shape as the old API client, so the rest of
 * the app didn't need to change; they just resolve immediately now.
 */

class TwilightClient {
    constructor() {
        // Results never change for a given date + place, so they're kept for the session
        this.cache = new Map();
        this.timezoneCache = new Map();
    }

    /**
     * Twilight times for one date and location
     * @returns {Promise<Object>}
     */
    async getTwilightTimes(date, lat, lng) {
        return this.calculate(this.formatDateForAPI(date), lat, lng);
    }

    /**
     * Twilight times for many dates
     * @returns {Promise<Map<string, {data: Object}>>} keyed by YYYY-MM-DD
     */
    async getTwilightRange(dates, lat, lng) {
        const results = new Map();
        dates.forEach(date => {
            const key = this.formatDateForAPI(date);
            if (!results.has(key)) {
                results.set(key, { data: this.calculate(key, lat, lng) });
            }
        });
        return results;
    }

    /**
     * Twilight times for many dates, in the same order as the input
     * @returns {Promise<Array<Object>>}
     */
    async getBatchTwilightTimes(dates, lat, lng) {
        return dates.map(date => this.calculate(this.formatDateForAPI(date), lat, lng));
    }

    /**
     * Synchronous version (calculation is instant, so this always has data)
     */
    getCachedTwilight(date, lat, lng) {
        return this.calculate(this.formatDateForAPI(date), lat, lng);
    }

    /**
     * Calculate (or reuse) the times for one YYYY-MM-DD date at a location.
     * The same object is returned for the same date + place, so the app can
     * tell nothing changed and skip re-rendering.
     */
    calculate(dateKey, lat, lng) {
        const cacheKey = this.cacheKeyFor(dateKey, lat, lng);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        let data;
        try {
            data = this.computeTimes(dateKey, Number(lat), Number(lng));
        } catch (error) {
            console.error('Sun calculation failed:', error);
            data = { dawn: 'N/A', dusk: 'N/A', sunrise: 'N/A', sunset: 'N/A', error: 'Calculation failed' };
        }

        this.cache.set(cacheKey, data);
        return data;
    }

    computeTimes(dateKey, lat, lng) {
        const [y, m, d] = dateKey.split('-').map(Number);
        // Local solar noon of that calendar day at this longitude: SunCalc then
        // picks the solar day around it, whatever the device's own time zone is
        const noon = new Date(Date.UTC(y, m - 1, d, 12) - (lng / 15) * 3600000);
        const t = SunCalc.getTimes(noon, lat, lng);
        const timezone = this.getTimezone(lat, lng);
        const fmt = date => (date ? this.formatTimeForTimezone(date, timezone) : 'N/A');
        const iso = date => (date ? date.toISOString() : null);

        // Golden hour: SunCalc's sun-angle times (sun below 6°), falling back to
        // one hour after sunrise / before sunset where the sun never gets that high
        const hour = 60 * 60 * 1000;
        const goldenAMEnd = t.goldenHourEnd || (t.sunrise && new Date(t.sunrise.getTime() + hour));
        const goldenPMStart = t.goldenHour || (t.sunset && new Date(t.sunset.getTime() - hour));

        // Polar day / night: no sunrise or sunset at all
        const noRise = t.alwaysUp ? 'Up all day' : t.alwaysDown ? 'No sunrise' : 'N/A';
        const noSet = t.alwaysUp ? 'Up all day' : t.alwaysDown ? 'No sunset' : 'N/A';

        return {
            dawn: fmt(t.dawn),
            dusk: fmt(t.dusk),
            sunrise: t.sunrise ? fmt(t.sunrise) : noRise,
            sunset: t.sunset ? fmt(t.sunset) : noSet,
            goldenHourMorningStart: fmt(t.sunrise),
            goldenHourMorningEnd: fmt(goldenAMEnd),
            goldenHourEveningStart: fmt(goldenPMStart),
            goldenHourEveningEnd: fmt(t.sunset),
            dawnISO: iso(t.dawn),
            duskISO: iso(t.dusk),
            sunriseISO: iso(t.sunrise),
            sunsetISO: iso(t.sunset),
            timezone
        };
    }

    /**
     * IANA time zone for a location (e.g. 'Europe/Helsinki'), looked up offline
     */
    getTimezone(lat, lng) {
        const key = `${Number(lat).toFixed(2)},${Number(lng).toFixed(2)}`;
        if (this.timezoneCache.has(key)) {
            return this.timezoneCache.get(key);
        }

        let timezone = null;
        try {
            if (typeof tzlookup === 'function') {
                timezone = tzlookup(lat, lng);
            }
        } catch (error) {
            console.warn('Time zone lookup failed:', error);
        }
        if (!timezone) {
            timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        }

        this.timezoneCache.set(key, timezone);
        return timezone;
    }

    /**
     * HH:MM (24h) in the given time zone; daylight saving is applied automatically
     */
    formatTimeForTimezone(date, timezone) {
        const options = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
        try {
            return date.toLocaleTimeString('en-GB', { ...options, timeZone: timezone });
        } catch (error) {
            console.warn(`Invalid timezone ${timezone}, using UTC`);
            return date.toLocaleTimeString('en-GB', { ...options, timeZone: 'UTC' });
        }
    }

    /**
     * YYYY-MM-DD using the local calendar date.
     * (toISOString() would convert to UTC and give the previous day during BST.)
     */
    formatDateForAPI(date) {
        const pad = n => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    cacheKeyFor(dateKey, lat, lng) {
        return `${dateKey}-${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
    }

    clearCache() {
        this.cache.clear();
    }
}

// Export for use in other modules
window.TwilightClient = TwilightClient;
