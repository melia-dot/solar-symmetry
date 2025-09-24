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
                if (response.status === 429) {
                    throw new Error('API rate limit reached - please wait a few minutes');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.status !== 'OK') {
                throw new Error(`API error: ${data.status}`);
            }

            const twilightData = this.processTwilightData(data.results, date, lat, lng);
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: twilightData,
                timestamp: Date.now()
            });

            return twilightData;
        } catch (error) {
            console.error('Failed to fetch twilight times:', error);
            
            // Return fallback data with more specific error info
            return {
                dawn: 'API Error',
                dusk: 'API Error', 
                sunrise: 'API Error',
                sunset: 'API Error',
                error: error.message,
                fallback: true
            };
        }
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

            return {
                dawn: this.formatTimeForTimezone(dawn, timezone),
                dusk: this.formatTimeForTimezone(dusk, timezone),
                sunrise: this.formatTimeForTimezone(sunrise, timezone),
                sunset: this.formatTimeForTimezone(sunset, timezone),
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