/**
 * Geocoding API Client
 * Handles location search and coordinate conversion using OpenStreetMap Nominatim
 */

class GeocodingClient {
    constructor() {
        this.baseUrl = 'https://nominatim.openstreetmap.org';
        this.cache = new Map();
        this.debounceTimer = null;
        this.debounceDelay = 300; // ms
    }

    /**
     * Search for locations based on query string
     * @param {string} query - Search query (city name, address, etc.)
     * @returns {Promise<Array>} - Array of location results
     */
    async searchLocations(query) {
        if (!query || query.length < 2) {
            return [];
        }

        // Check cache first
        const cacheKey = query.toLowerCase().trim();
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const url = new URL('/search', this.baseUrl);
            url.searchParams.set('q', query);
            url.searchParams.set('format', 'json');
            url.searchParams.set('limit', '5');
            url.searchParams.set('addressdetails', '1');
            url.searchParams.set('extratags', '1');

            const response = await fetch(url.toString(), {
                headers: {
                    'User-Agent': 'SolarSymmetryApp/1.0'
                }
            });

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
     * Search with debouncing to avoid too many API calls
     * @param {string} query - Search query
     * @param {Function} callback - Callback function to handle results
     */
    searchWithDebounce(query, callback) {
        clearTimeout(this.debounceTimer);
        
        this.debounceTimer = setTimeout(async () => {
            const results = await this.searchLocations(query);
            callback(results);
        }, this.debounceDelay);
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
        
        // Add city/town/village
        if (address.city) {
            parts.push(address.city);
        } else if (address.town) {
            parts.push(address.town);
        } else if (address.village) {
            parts.push(address.village);
        } else if (address.municipality) {
            parts.push(address.municipality);
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
            return item.display_name.split(',').slice(0, 3).join(', ');
        }
        
        return parts.join(', ');
    }

    /**
     * Get coordinates for a specific location
     * @param {string} locationId - Location ID from search results
     * @returns {Promise<Object>} - Coordinates object with lat/lng
     */
    async getCoordinates(locationId) {
        try {
            const url = new URL('/lookup', this.baseUrl);
            url.searchParams.set('osm_ids', `N${locationId}`);
            url.searchParams.set('format', 'json');

            const response = await fetch(url.toString(), {
                headers: {
                    'User-Agent': 'SolarSymmetryApp/1.0'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
            
            throw new Error('Location not found');
        } catch (error) {
            console.error('Failed to get coordinates:', error);
            throw error;
        }
    }

    /**
     * Reverse geocoding - get location name from coordinates
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Promise<string>} - Location name
     */
    async reverseGeocode(lat, lng) {
        try {
            const url = new URL('/reverse', this.baseUrl);
            url.searchParams.set('lat', lat.toString());
            url.searchParams.set('lon', lng.toString());
            url.searchParams.set('format', 'json');
            url.searchParams.set('addressdetails', '1');

            const response = await fetch(url.toString(), {
                headers: {
                    'User-Agent': 'SolarSymmetryApp/1.0'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return this.formatLocationName(data);
        } catch (error) {
            console.error('Reverse geocoding failed:', error);
            return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
    }

    /**
     * Clear the search cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get user's current location using browser geolocation
     * @returns {Promise<Object>} - Coordinates and location name
     */
    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by this browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    try {
                        const locationName = await this.reverseGeocode(lat, lng);
                        resolve({
                            lat,
                            lng,
                            name: locationName
                        });
                    } catch (error) {
                        resolve({
                            lat,
                            lng,
                            name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
                        });
                    }
                },
                (error) => {
                    reject(new Error(`Geolocation error: ${error.message}`));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                }
            );
        });
    }
}

// Export for use in other modules
window.GeocodingClient = GeocodingClient;