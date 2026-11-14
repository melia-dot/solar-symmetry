/**
 * Twilight API Client
 * Handles fetching civil twilight times (dawn/dusk) from the sunrise-sunset.org API (v2)
 *
 * Rate limit: the API answers HTTP 429 with "Please limit your usage to 5 requests
 * per second" and a Retry-After header. Every request in the app goes through one
 * shared queue (max 2 in flight, max 4 starts per second) so no combination of
 * features can exceed it. A date range counts as a single request, so whole spans
 * of days are fetched with date_start/date_end instead of one call per day.
 */

class TwilightError extends Error {
    constructor(message, { status = null, code = 'unknown', retryable = false, retryAfter = null } = {}) {
        super(message);
        this.name = 'TwilightError';
        this.status = status;
        this.code = code;
        this.retryable = retryable;
        this.retryAfter = retryAfter; // seconds, from the Retry-After header
    }
}

function createAbortError() {
    return new DOMException('Request cancelled', 'AbortError');
}

function isAbortError(error) {
    return error && error.name === 'AbortError';
}

class TwilightClient {
    constructor() {
        this.baseUrl = 'https://api.sunrise-sunset.org/v2';
        this.cache = new Map();
        this.maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        // Shared request queue (keeps us under the API's 5 requests/second limit)
        this.maxConcurrent = 2;
        this.minStartInterval = 250; // ms between request starts → at most 4/second
        this.queue = [];
        this.activeRequests = 0;
        this.lastStartTime = 0;
        this.pausedUntil = 0; // set from Retry-After when the API says 429
        this.pumpTimer = null;

        // Waits between retries: 3 retries after the first attempt
        this.retryDelays = [1000, 3000, 6000];
        this.maxRangeDays = 366; // API limit for one date range request
    }

    /**
     * Get twilight times for a specific date and location
     * @param {Date} date - The date to get twilight times for
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Promise<Object>} - Object with dawn and dusk times (or an error fallback)
     */
    async getTwilightTimes(date, lat, lng) {
        const key = this.formatDateForAPI(date);
        const results = await this.getTwilightRange([date], lat, lng);
        const result = results.get(key);

        if (result && result.data) {
            return result.data;
        }

        // Return fallback data with more specific error info
        return {
            dawn: 'API Error',
            dusk: 'API Error',
            sunrise: 'API Error',
            sunset: 'API Error',
            error: result && result.error ? result.error.message : 'Unknown error',
            fallback: true
        };
    }

    /**
     * Get twilight times for many dates, using as few requests as possible.
     * Cached dates are not re-fetched; the rest are grouped into runs of
     * consecutive days and each run is fetched with one date-range request.
     * Success/failure is tracked per date.
     *
     * @param {Array<Date>} dates - Dates to fetch (any order, duplicates allowed)
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {Object} [options]
     * @param {AbortSignal} [options.signal] - Cancels queued/in-flight requests
     * @returns {Promise<Map<string, {data?: Object, error?: TwilightError}>>}
     *          Keyed by YYYY-MM-DD. Rejects with AbortError if cancelled.
     */
    async getTwilightRange(dates, lat, lng, { signal } = {}) {
        const results = new Map();
        const needed = [];

        dates.forEach(date => {
            const key = this.formatDateForAPI(date);
            if (results.has(key)) return;

            const cached = this.getCachedByKey(key, lat, lng);
            if (cached) {
                results.set(key, { data: cached });
            } else {
                results.set(key, null);
                needed.push(key);
            }
        });

        const runs = this.groupIntoRuns(needed);
        await Promise.all(runs.map(run => this.fetchRun(run, lat, lng, signal, results)));

        return results;
    }

    /**
     * Get cached twilight data for a date without making a request
     * @returns {Object|null}
     */
    getCachedTwilight(date, lat, lng) {
        return this.getCachedByKey(this.formatDateForAPI(date), lat, lng);
    }

    getCachedByKey(dateKey, lat, lng) {
        const cacheKey = this.cacheKeyFor(dateKey, lat, lng);
        const cached = this.cache.get(cacheKey);
        if (!cached) return null;

        if (Date.now() - cached.timestamp < this.maxCacheAge) {
            return cached.data;
        }
        this.cache.delete(cacheKey);
        return null;
    }

    /**
     * Fetch one run of consecutive dates and record a result for each date
     */
    async fetchRun(run, lat, lng, signal, results) {
        const first = run[0];
        const last = run[run.length - 1];
        const label = run.length === 1 ? first : `${first}…${last}`;
        const params = run.length === 1
            ? { lat, lng, date: first }
            : { lat, lng, date_start: first, date_end: last };

        try {
            const body = await this.request(params, label, signal);

            // Range responses have a days[] array; single-date responses are one day object
            const days = Array.isArray(body.days) ? body.days : [body];
            const byDate = new Map(days.map(day => [day.date, day]));

            run.forEach(key => {
                const day = byDate.get(key);
                if (!day) {
                    this.recordFailure(results, key, new TwilightError('Date missing from API response', { code: 'missing_day' }));
                    return;
                }

                const data = this.processTwilightData(day, null, lat, lng);
                if (data.error) {
                    this.recordFailure(results, key, new TwilightError(data.error, { code: 'bad_data' }));
                    return;
                }

                this.cache.set(this.cacheKeyFor(key, lat, lng), { data, timestamp: Date.now() });
                results.set(key, { data });
            });
        } catch (error) {
            if (isAbortError(error)) throw error;
            run.forEach(key => this.recordFailure(results, key, error));
        }
    }

    recordFailure(results, dateKey, error) {
        console.error(`[twilight] ${dateKey} failed: ${this.describeError(error)}`);
        results.set(dateKey, { error });
    }

    /**
     * Make one API request, retrying errors that can fix themselves
     * (429, 5xx, network) up to 3 times with growing waits.
     * Errors that won't fix themselves (400 invalid location/date, 404) are not retried.
     */
    async request(params, label, signal) {
        const url = this.buildUrl(params);
        const totalAttempts = this.retryDelays.length + 1;

        for (let attempt = 0; ; attempt++) {
            try {
                return await this.schedule(() => this.attempt(url, signal), signal);
            } catch (error) {
                if (isAbortError(error) || (signal && signal.aborted)) {
                    throw createAbortError();
                }

                if (!error.retryable || attempt >= this.retryDelays.length) {
                    throw error;
                }

                let wait = this.retryDelays[attempt];
                if (error.retryAfter) {
                    wait = Math.max(wait, error.retryAfter * 1000);
                }

                console.warn(`[twilight] ${label}: ${this.describeError(error)} – attempt ${attempt + 1}/${totalAttempts}, retrying in ${wait / 1000}s`);
                await this.sleep(wait, signal);
            }
        }
    }

    /**
     * A single HTTP attempt. Throws TwilightError (classified) or AbortError.
     */
    async attempt(url, signal) {
        let response;
        try {
            response = await fetch(url, { signal });
        } catch (error) {
            if (isAbortError(error)) throw error;
            throw new TwilightError(`Network error: ${error.message}`, { code: 'network', retryable: true });
        }

        let body = null;
        try {
            body = await response.json();
        } catch (error) {
            if (isAbortError(error)) throw error;
        }

        if (response.ok) {
            if (body) return body;
            throw new TwilightError('Response was not valid JSON', { status: response.status, code: 'bad_json', retryable: true });
        }

        const status = response.status;
        const retryAfterHeader = parseFloat(response.headers.get('Retry-After'));
        const retryAfter = Number.isFinite(retryAfterHeader) ? retryAfterHeader : null;

        if (status === 429) {
            // Pause the whole queue, not just this request
            this.pausedUntil = Math.max(this.pausedUntil, Date.now() + (retryAfter || 1) * 1000);
        }

        const code = (body && (body.error || body.status)) || `http_${status}`;
        const message = (body && body.message) || `HTTP ${status}`;

        throw new TwilightError(message, {
            status,
            code,
            retryable: status === 429 || status >= 500,
            retryAfter
        });
    }

    /**
     * Add a request to the shared queue
     */
    schedule(fn, signal) {
        return new Promise((resolve, reject) => {
            if (signal && signal.aborted) {
                reject(createAbortError());
                return;
            }

            const task = { fn, resolve, reject };

            if (signal) {
                signal.addEventListener('abort', () => {
                    const index = this.queue.indexOf(task);
                    if (index !== -1) {
                        this.queue.splice(index, 1);
                        reject(createAbortError());
                    }
                }, { once: true });
            }

            this.queue.push(task);
            this.pump();
        });
    }

    pump() {
        if (this.pumpTimer || this.queue.length === 0 || this.activeRequests >= this.maxConcurrent) {
            return;
        }

        const now = Date.now();
        const nextStart = Math.max(this.lastStartTime + this.minStartInterval, this.pausedUntil);
        if (nextStart > now) {
            this.pumpTimer = setTimeout(() => {
                this.pumpTimer = null;
                this.pump();
            }, nextStart - now);
            return;
        }

        const task = this.queue.shift();
        this.activeRequests++;
        this.lastStartTime = now;

        Promise.resolve()
            .then(task.fn)
            .then(task.resolve, task.reject)
            .finally(() => {
                this.activeRequests--;
                this.pump();
            });

        this.pump();
    }

    sleep(ms, signal) {
        return new Promise((resolve, reject) => {
            if (signal && signal.aborted) {
                reject(createAbortError());
                return;
            }
            const timer = setTimeout(resolve, ms);
            if (signal) {
                signal.addEventListener('abort', () => {
                    clearTimeout(timer);
                    reject(createAbortError());
                }, { once: true });
            }
        });
    }

    buildUrl(params) {
        const url = new URL(this.baseUrl);
        Object.entries(params).forEach(([name, value]) => {
            url.searchParams.set(name, value.toString());
        });
        return url.toString();
    }

    describeError(error) {
        if (error instanceof TwilightError) {
            return error.status ? `${error.status} ${error.code} (${error.message})` : `${error.code} (${error.message})`;
        }
        return error && error.message ? error.message : String(error);
    }

    /**
     * Group YYYY-MM-DD keys into runs of consecutive days (max 366 per run)
     * @param {Array<string>} keys
     * @returns {Array<Array<string>>}
     */
    groupIntoRuns(keys) {
        const dayNumber = key => {
            const [y, m, d] = key.split('-').map(Number);
            return Date.UTC(y, m - 1, d) / 86400000;
        };

        const sorted = Array.from(new Set(keys)).sort();
        const runs = [];
        let current = [];

        sorted.forEach(key => {
            const previous = current[current.length - 1];
            if (previous && dayNumber(key) === dayNumber(previous) + 1 && current.length < this.maxRangeDays) {
                current.push(key);
            } else {
                if (current.length) runs.push(current);
                current = [key];
            }
        });
        if (current.length) runs.push(current);

        return runs;
    }

    /**
     * Get twilight times for multiple dates (batch processing with intelligent deduplication)
     * @param {Array<Date>} dates - Array of dates
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Promise<Array>} - Array of twilight data objects
     */
    async getBatchTwilightTimes(dates, lat, lng) {
        if (dates.length === 0) return [];
        
        // Deduplicate dates to avoid unnecessary API calls
        const uniqueDateMap = new Map();
        const dateKeys = [];
        
        dates.forEach((date, index) => {
            const key = this.formatDateForAPI(date);
            dateKeys.push(key);
            
            if (!uniqueDateMap.has(key)) {
                uniqueDateMap.set(key, {
                    date: date,
                    indices: []
                });
            }
            uniqueDateMap.get(key).indices.push(index);
        });
        
        const uniqueDates = Array.from(uniqueDateMap.values()).map(item => item.date);
        console.log(`Batch request: ${dates.length} dates → ${uniqueDates.length} unique API calls`);
        
        try {
            // Process unique dates with rate limiting
            const results = [];
            const batchSize = 2; // Reduce to 2 concurrent requests
            
            for (let i = 0; i < uniqueDates.length; i += batchSize) {
                const batch = uniqueDates.slice(i, i + batchSize);
                const batchPromises = batch.map(date => 
                    this.getTwilightTimes(date, lat, lng)
                );
                
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
                
                // Longer delay between batches to be extra API-friendly
                if (i + batchSize < uniqueDates.length) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            
            // Map results back to original order
            const finalResults = new Array(dates.length);
            const uniqueKeys = Array.from(uniqueDateMap.keys());
            
            uniqueKeys.forEach((key, resultIndex) => {
                const dateInfo = uniqueDateMap.get(key);
                const twilightData = results[resultIndex];
                
                dateInfo.indices.forEach(originalIndex => {
                    finalResults[originalIndex] = twilightData;
                });
            });
            
            return finalResults;
            
        } catch (error) {
            console.error('Batch twilight fetch failed:', error);
            // Return array of fallback data
            return dates.map(() => ({
                dawn: 'N/A',
                dusk: 'N/A',
                sunrise: 'N/A',
                sunset: 'N/A',
                error: 'Batch fetch failed'
            }));
        }
    }

    /**
     * Process raw API data into our format
     * @param {Object} results - Raw API results
     * @param {Date} date - The date for timezone context
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Object} - Processed twilight data
     */
    processTwilightData(results, date, lat, lng) {
        try {
            // The API returns UTC times, we need to convert to local timezone
            const dawn = new Date(results.civil_twilight_begin);
            const dusk = new Date(results.civil_twilight_end);
            const sunrise = new Date(results.sunrise);
            const sunset = new Date(results.sunset);

            // Get the timezone for this location
            const timezone = this.getTimezoneForCoordinates(lat, lng);

            // Calculate golden hour times
            const goldenHourMorningStart = new Date(sunrise.getTime());
            const goldenHourMorningEnd = new Date(sunrise.getTime() + (60 * 60 * 1000)); // 1 hour after sunrise
            
            const goldenHourEveningStart = new Date(sunset.getTime() - (60 * 60 * 1000)); // 1 hour before sunset
            const goldenHourEveningEnd = new Date(sunset.getTime());

            return {
                dawn: this.formatTimeForTimezone(dawn, timezone),
                dusk: this.formatTimeForTimezone(dusk, timezone),
                sunrise: this.formatTimeForTimezone(sunrise, timezone),
                sunset: this.formatTimeForTimezone(sunset, timezone),
                goldenHourMorningStart: this.formatTimeForTimezone(goldenHourMorningStart, timezone),
                goldenHourMorningEnd: this.formatTimeForTimezone(goldenHourMorningEnd, timezone),
                goldenHourEveningStart: this.formatTimeForTimezone(goldenHourEveningStart, timezone),
                goldenHourEveningEnd: this.formatTimeForTimezone(goldenHourEveningEnd, timezone),
                dawnISO: dawn.toISOString(),
                duskISO: dusk.toISOString(),
                sunriseISO: sunrise.toISOString(),
                sunsetISO: sunset.toISOString()
            };
        } catch (error) {
            console.error('Error processing twilight data:', error);
            return {
                dawn: 'N/A',
                dusk: 'N/A',
                sunrise: 'N/A',
                sunset: 'N/A',
                error: 'Data processing failed'
            };
        }
    }

    /**
     * Format date for API request (YYYY-MM-DD), using the local calendar date.
     * (toISOString() would convert to UTC and give the previous day during BST.)
     * @param {Date} date - Date to format
     * @returns {string} - Formatted date string
     */
    formatDateForAPI(date) {
        const pad = n => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    /**
     * Format time for display (HH:MM)
     * @param {Date} date - Date object with time
     * @returns {string} - Formatted time string
     */
    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    /**
     * Get timezone for coordinates using approximate timezone mapping
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {string} - IANA timezone identifier
     */
    getTimezoneForCoordinates(lat, lng) {
        // Montreal is approximately 45.5°N, -73.6°W
        // UK is approximately 51.5°N, -0.1°W
        
        if (lng >= -141 && lng <= -60) {
            // North America (both USA and Canada)
            // Atlantic timezone: east of -65°W
            if (lng > -65) return 'America/Halifax';
            // Eastern timezone: -65°W to -90°W (includes Montreal at -73.5°W)
            if (lng > -90) {
                if (lat >= 41) {
                    return 'America/Toronto';  // Canada Eastern (includes Montreal, Toronto)
                } else {
                    return 'America/New_York'; // USA Eastern
                }
            }
            // Central timezone: -90°W to -105°W  
            if (lng > -105) return 'America/Chicago';
            // Mountain timezone: -105°W to -120°W
            if (lng > -120) return 'America/Denver';
            // Pacific timezone: west of -120°W
            return 'America/Los_Angeles';
        }
        
        if (lng >= -15 && lng <= 40 && lat >= 35) {
            // Europe
            if (lng <= 2) return 'Europe/London';
            if (lng <= 15) return 'Europe/Paris';
            if (lng <= 25) return 'Europe/Berlin';
            return 'Europe/Moscow';
        }
        
        if (lng >= 100 && lng <= 180) {
            // Asia-Pacific
            if (lng <= 120) return 'Asia/Shanghai';
            if (lng <= 140) return 'Asia/Tokyo';
            return 'Pacific/Auckland';
        }
        
        // Default fallback
        return 'UTC';
    }

    /**
     * Format time for a specific timezone
     * @param {Date} date - UTC date object
     * @param {string} timezone - IANA timezone identifier
     * @returns {string} - Formatted time string
     */
    formatTimeForTimezone(date, timezone) {
        try {
            return date.toLocaleTimeString('en-US', {
                timeZone: timezone,
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } catch (error) {
            console.warn(`Invalid timezone ${timezone}, using UTC`);
            return date.toLocaleTimeString('en-US', {
                timeZone: 'UTC',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        }
    }

    /**
     * Generate cache key for storing results
     * @param {Date} date - The date
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {string} - Cache key
     */
    generateCacheKey(date, lat, lng) {
        return this.cacheKeyFor(this.formatDateForAPI(date), lat, lng);
    }

    cacheKeyFor(dateKey, lat, lng) {
        const latLng = `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
        return `${dateKey}-${latLng}`;
    }

    /**
     * Clear expired cache entries
     */
    cleanCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp >= this.maxCacheAge) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear all cache entries
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} - Cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxAge: this.maxCacheAge,
            entries: Array.from(this.cache.keys())
        };
    }

    /**
     * Check if twilight data is available for a location
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Promise<boolean>} - True if data is available
     */
    async isDataAvailable(lat, lng) {
        try {
            const testDate = new Date();
            const result = await this.getTwilightTimes(testDate, lat, lng);
            return !result.error;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get timezone offset for a location (approximate)
     * @param {number} lng - Longitude
     * @returns {number} - Timezone offset in hours
     */
    getTimezoneOffset(lng) {
        // Rough approximation: 15 degrees per hour
        return Math.round(lng / 15);
    }
}

// Export for use in other modules
window.TwilightClient = TwilightClient;
window.TwilightError = TwilightError;