/**
 * Twilight API Client
 * Handles fetching civil twilight times (dawn/dusk) from sunrise-sunset.org API
 */

class TwilightClient {
    constructor() {
        this.baseUrl = 'https://api.sunrise-sunset.org/json';
        this.cache = new Map();
        this.maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    }

    /**
     * Get twilight times for a specific date and location
     * @param {Date} date - The date to get twilight times for
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Promise<Object>} - Object with dawn and dusk times
     */
    async getTwilightTimes(date, lat, lng) {
        const cacheKey = this.generateCacheKey(date, lat, lng);
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.maxCacheAge) {
                return cached.data;
            } else {
                this.cache.delete(cacheKey);
            }
        }

        try {
            const url = new URL(this.baseUrl);
            url.searchParams.set('lat', lat.toString());
            url.searchParams.set('lng', lng.toString());
            url.searchParams.set('date', this.formatDateForAPI(date));
            url.searchParams.set('formatted', '0'); // Get ISO format times

            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.status !== 'OK') {
                throw new Error(`API error: ${data.status}`);
            }

            const twilightData = this.processTwilightData(data.results, date);
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: twilightData,
                timestamp: Date.now()
            });

            return twilightData;
        } catch (error) {
            console.error('Failed to fetch twilight times:', error);
            
            // Return fallback data
            return {
                dawn: 'N/A',
                dusk: 'N/A',
                sunrise: 'N/A',
                sunset: 'N/A',
                error: error.message
            };
        }
    }

    /**
     * Get twilight times for multiple dates (batch processing)
     * @param {Array<Date>} dates - Array of dates
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Promise<Array>} - Array of twilight data objects
     */
    async getBatchTwilightTimes(dates, lat, lng) {
        const promises = dates.map(date => 
            this.getTwilightTimes(date, lat, lng)
        );
        
        try {
            return await Promise.all(promises);
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
     * @returns {Object} - Processed twilight data
     */
    processTwilightData(results, date) {
        try {
            // The API returns UTC times, we need to convert to local time
            const dawn = new Date(results.civil_twilight_begin);
            const dusk = new Date(results.civil_twilight_end);
            const sunrise = new Date(results.sunrise);
            const sunset = new Date(results.sunset);

            return {
                dawn: this.formatTime(dawn),
                dusk: this.formatTime(dusk),
                sunrise: this.formatTime(sunrise),
                sunset: this.formatTime(sunset),
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
     * Format date for API request (YYYY-MM-DD)
     * @param {Date} date - Date to format
     * @returns {string} - Formatted date string
     */
    formatDateForAPI(date) {
        return date.toISOString().split('T')[0];
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
     * Generate cache key for storing results
     * @param {Date} date - The date
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {string} - Cache key
     */
    generateCacheKey(date, lat, lng) {
        const dateStr = this.formatDateForAPI(date);
        const latLng = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        return `${dateStr}-${latLng}`;
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