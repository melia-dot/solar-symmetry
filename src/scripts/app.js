/**
 * Solar Symmetry App
 * Main application logic and UI coordination
 */

class SolarSymmetryApp {
    constructor() {
        this.dateCalc = new DateCalculations();
        this.geocoding = new GeocodingClient();
        this.twilight = new TwilightClient();
        
        this.currentMonth = new Date();
        this.currentLocation = null;
        this.isLoading = false;
        
        this.initializeElements();
        this.bindEvents();
        this.initializeApp();
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        this.elements = {
            locationInput: document.getElementById('locationInput'),
            locationDropdown: document.getElementById('locationDropdown'),
            currentMonth: document.getElementById('currentMonth'),
            prevMonth: document.getElementById('prevMonth'),
            nextMonth: document.getElementById('nextMonth'),
            currentDates: document.getElementById('currentDates'),
            mirroredDates: document.getElementById('mirroredDates'),
            loadingIndicator: document.getElementById('loadingIndicator')
        };
        
        // Add keyboard navigation state
        this.selectedLocationIndex = -1;
        this.currentLocations = [];
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Location search
        this.elements.locationInput.addEventListener('input', (e) => {
            this.handleLocationSearch(e.target.value);
        });
        
        // Location input keyboard navigation
        this.elements.locationInput.addEventListener('keydown', (e) => {
            this.handleLocationKeydown(e);
        });

        // Click outside to close dropdown
        document.addEventListener('click', (e) => {
            if (!this.elements.locationInput.contains(e.target) && 
                !this.elements.locationDropdown.contains(e.target)) {
                this.hideLocationDropdown();
            }
        });

        // Month navigation
        this.elements.prevMonth.addEventListener('click', () => {
            this.navigateToPreviousMonth();
        });

        this.elements.nextMonth.addEventListener('click', () => {
            this.navigateToNextMonth();
        });

        // Keyboard navigation for months (only when not focused on location input)
        document.addEventListener('keydown', (e) => {
            if (e.target === this.elements.locationInput) return; // Don't interfere with location search
            
            if (e.key === 'ArrowLeft' && this.dateCalc.canGoToPreviousMonth(this.currentMonth)) {
                this.navigateToPreviousMonth();
            } else if (e.key === 'ArrowRight' && this.dateCalc.canGoToNextMonth(this.currentMonth)) {
                this.navigateToNextMonth();
            }
        });
    }

    /**
     * Initialize the application
     */
    async initializeApp() {
        this.updateMonthDisplay();
        
        // Don't auto-detect location - let user choose
        this.elements.locationInput.placeholder = 'Enter your city to see solar symmetry...';
        
        // Render empty state without data
        this.renderEmptyState();
    }

    /**
     * Handle keyboard navigation in location input
     */
    handleLocationKeydown(e) {
        const dropdown = this.elements.locationDropdown;
        
        if (dropdown.classList.contains('hidden') || this.currentLocations.length === 0) {
            return;
        }
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedLocationIndex = Math.min(
                    this.selectedLocationIndex + 1, 
                    this.currentLocations.length - 1
                );
                this.updateLocationSelection();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.selectedLocationIndex = Math.max(
                    this.selectedLocationIndex - 1, 
                    -1
                );
                this.updateLocationSelection();
                break;
                
            case 'Enter':
                e.preventDefault();
                if (this.selectedLocationIndex >= 0) {
                    this.selectLocation(this.currentLocations[this.selectedLocationIndex]);
                }
                // Always blur the input when Enter is pressed
                this.elements.locationInput.blur();
                break;
                
            case 'Escape':
                this.hideLocationDropdown();
                break;
        }
    }

    /**
     * Update visual selection in location dropdown
     */
    updateLocationSelection() {
        const options = this.elements.locationDropdown.querySelectorAll('.location-option');
        
        options.forEach((option, index) => {
            if (index === this.selectedLocationIndex) {
                option.classList.add('selected');
                option.scrollIntoView({ block: 'nearest' });
            } else {
                option.classList.remove('selected');
            }
        });
    }

    /**
     * Handle location search input
     */
    handleLocationSearch(query) {
        if (query.length < 2) {
            this.hideLocationDropdown();
            return;
        }

        this.geocoding.searchWithDebounce(query, (results) => {
            this.showLocationDropdown(results);
        });
    }

    /**
     * Show location search dropdown
     */
    showLocationDropdown(locations) {
        const dropdown = this.elements.locationDropdown;
        dropdown.innerHTML = '';
        
        // Reset selection state
        this.selectedLocationIndex = -1;
        this.currentLocations = locations;

        if (locations.length === 0) {
            dropdown.innerHTML = '<div class="location-option">No locations found</div>';
        } else {
            locations.forEach((location, index) => {
                const option = document.createElement('div');
                option.className = 'location-option';
                option.textContent = location.name;
                option.addEventListener('click', () => {
                    this.selectLocation(location);
                });
                
                // Add mouse hover to update selection
                option.addEventListener('mouseenter', () => {
                    this.selectedLocationIndex = index;
                    this.updateLocationSelection();
                });
                
                dropdown.appendChild(option);
            });
        }

        dropdown.classList.remove('hidden');
    }

    /**
     * Hide location dropdown
     */
    hideLocationDropdown() {
        this.elements.locationDropdown.classList.add('hidden');
        this.selectedLocationIndex = -1;
        this.currentLocations = [];
    }

    /**
     * Select a location from search results
     */
    async selectLocation(location) {
        this.elements.locationInput.value = location.name;
        this.elements.locationInput.blur(); // Remove focus from input
        this.setCurrentLocation(location);
        this.hideLocationDropdown();
        
        this.showLoading();
        await this.loadMonthData();
        this.hideLoading();
    }

    /**
     * Set the current location
     */
    setCurrentLocation(location) {
        this.currentLocation = location;
    }

    /**
     * Navigate to previous month
     */
    async navigateToPreviousMonth() {
        if (!this.dateCalc.canGoToPreviousMonth(this.currentMonth)) return;
        
        this.currentMonth = this.dateCalc.getPreviousMonth(this.currentMonth);
        this.updateMonthDisplay();
        this.updateNavigationButtons();
        
        this.showLoading();
        await this.loadMonthData();
        this.hideLoading();
    }

    /**
     * Navigate to next month
     */
    async navigateToNextMonth() {
        if (!this.dateCalc.canGoToNextMonth(this.currentMonth)) return;
        
        this.currentMonth = this.dateCalc.getNextMonth(this.currentMonth);
        this.updateMonthDisplay();
        this.updateNavigationButtons();
        
        this.showLoading();
        await this.loadMonthData();
        this.hideLoading();
    }

    /**
     * Update month display
     */
    updateMonthDisplay() {
        const monthYear = this.dateCalc.formatMonthYear(this.currentMonth);
        this.elements.currentMonth.textContent = monthYear;
        this.updateNavigationButtons();
    }

    /**
     * Update navigation button states
     */
    updateNavigationButtons() {
        this.elements.prevMonth.disabled = !this.dateCalc.canGoToPreviousMonth(this.currentMonth);
        this.elements.nextMonth.disabled = !this.dateCalc.canGoToNextMonth(this.currentMonth);
    }

    /**
     * Render empty state without data
     */
    renderEmptyState() {
        const currentContainer = this.elements.currentDates;
        const mirroredContainer = this.elements.mirroredDates;
        
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-state';
        emptyMessage.innerHTML = `
            <div class="empty-icon">🌅</div>
            <p>Search for your city above to discover solar symmetry patterns</p>
            <small>See how dates mirror around solstices with identical twilight times</small>
        `;
        
        currentContainer.innerHTML = '';
        mirroredContainer.innerHTML = '';
        currentContainer.appendChild(emptyMessage.cloneNode(true));
        mirroredContainer.appendChild(emptyMessage);
    }

    /**
     * Load month data with optimized twilight fetching
     */
    async loadMonthData() {
        if (!this.currentLocation) return;

        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth() + 1;
        
        // Get all dates for the month with their mirrors
        const monthData = this.dateCalc.getMonthWithMirrors(year, month);
        
        // Render immediately with loading placeholders
        this.renderMonthData(monthData);
        
        try {
            // Process in smaller chunks to show progress
            const chunkSize = 5; // Process 5 dates at a time
            const chunks = [];
            
            for (let i = 0; i < monthData.length; i += chunkSize) {
                chunks.push(monthData.slice(i, i + chunkSize));
            }
            
            // Process each chunk sequentially
            for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
                const chunk = chunks[chunkIndex];
                
                // Get unique dates for this chunk
                const uniqueDates = new Set();
                const dateMap = new Map();
                
                chunk.forEach((item, localIndex) => {
                    const globalIndex = chunkIndex * chunkSize + localIndex;
                    
                    // Add current date
                    const currentKey = this.formatDateKey(item.current);
                    if (!uniqueDates.has(currentKey)) {
                        uniqueDates.add(currentKey);
                        dateMap.set(currentKey, { date: item.current, indices: [] });
                    }
                    dateMap.get(currentKey).indices.push({ type: 'current', index: globalIndex });
                    
                    // Add mirrored date
                    const mirroredKey = this.formatDateKey(item.mirrored);
                    if (!uniqueDates.has(mirroredKey)) {
                        uniqueDates.add(mirroredKey);
                        dateMap.set(mirroredKey, { date: item.mirrored, indices: [] });
                    }
                    dateMap.get(mirroredKey).indices.push({ type: 'mirrored', index: globalIndex });
                });
                
                // Fetch twilight data for unique dates only
                const uniqueDateArray = Array.from(dateMap.values()).map(item => item.date);
                const twilightResults = await this.twilight.getBatchTwilightTimes(
                    uniqueDateArray,
                    this.currentLocation.lat,
                    this.currentLocation.lng
                );
                
                // Map results back to original positions
                const uniqueKeys = Array.from(uniqueDates);
                uniqueKeys.forEach((key, resultIndex) => {
                    const twilightData = twilightResults[resultIndex];
                    const dateInfo = dateMap.get(key);
                    
                    dateInfo.indices.forEach(({ type, index }) => {
                        if (type === 'current') {
                            monthData[index].currentTwilight = twilightData;
                        } else {
                            monthData[index].mirroredTwilight = twilightData;
                        }
                    });
                });
                
                // Re-render with updated data
                this.renderMonthData(monthData);
                
                // Small delay to show progress
                if (chunkIndex < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        } catch (error) {
            console.error('Failed to load twilight data:', error);
            this.renderMonthData(monthData); // Render without twilight data
        }
    }

    /**
     * Render month data to the UI
     */
    renderMonthData(monthData) {
        this.renderCurrentColumn(monthData);
        this.renderMirroredColumn(monthData);
    }

    /**
     * Render current month column
     */
    renderCurrentColumn(monthData) {
        const container = this.elements.currentDates;
        container.innerHTML = '';

        monthData.forEach(item => {
            const dateElement = this.createDateElement(
                item.current, 
                item.currentTwilight, 
                item.isToday
            );
            container.appendChild(dateElement);
        });
    }

    /**
     * Render mirrored dates column
     */
    renderMirroredColumn(monthData) {
        const container = this.elements.mirroredDates;
        container.innerHTML = '';

        monthData.forEach(item => {
            const dateElement = this.createDateElement(
                item.mirrored, 
                item.mirroredTwilight, 
                false
            );
            container.appendChild(dateElement);
        });
    }

    /**
     * Create a date element with all twilight and sun times
     */
    createDateElement(date, twilightData, isToday = false) {
        const element = document.createElement('div');
        element.className = `date-item ${isToday ? 'today' : ''}`;

        const dateHeader = document.createElement('div');
        dateHeader.className = 'date-header';
        dateHeader.textContent = this.dateCalc.formatDate(date);

        const twilightTimes = document.createElement('div');
        twilightTimes.className = 'twilight-times';

        if (twilightData && !twilightData.error) {
            // Dawn (Civil Twilight Begin)
            const dawnTime = document.createElement('div');
            dawnTime.className = 'twilight-time';
            dawnTime.innerHTML = `
                <span class="time-icon">🌅</span> 
                <div>
                    <div class="time-label">Dawn</div>
                    <div>${twilightData.dawn}</div>
                </div>
            `;

            // Sunrise
            const sunriseTime = document.createElement('div');
            sunriseTime.className = 'twilight-time';
            sunriseTime.innerHTML = `
                <span class="time-icon">☀️</span>
                <div>
                    <div class="time-label">Sunrise</div>
                    <div>${twilightData.sunrise}</div>
                </div>
            `;

            // Sunset
            const sunsetTime = document.createElement('div');
            sunsetTime.className = 'twilight-time';
            sunsetTime.innerHTML = `
                <span class="time-icon">🌄</span>
                <div>
                    <div class="time-label">Sunset</div>
                    <div>${twilightData.sunset}</div>
                </div>
            `;

            // Dusk (Civil Twilight End)
            const duskTime = document.createElement('div');
            duskTime.className = 'twilight-time';
            duskTime.innerHTML = `
                <span class="time-icon">🌇</span>
                <div>
                    <div class="time-label">Dusk</div>
                    <div>${twilightData.dusk}</div>
                </div>
            `;

            twilightTimes.appendChild(dawnTime);
            twilightTimes.appendChild(sunriseTime);
            twilightTimes.appendChild(sunsetTime);
            twilightTimes.appendChild(duskTime);
        } else {
            twilightTimes.innerHTML = '<div class="twilight-time">Loading...</div>';
        }

        element.appendChild(dateHeader);
        element.appendChild(twilightTimes);

        return element;
    }

    /**
     * Format date as key for deduplication
     */
    formatDateKey(date) {
        return date.toISOString().split('T')[0];
    }

    /**
     * Show loading indicator
     */
    showLoading() {
        this.isLoading = true;
        this.elements.loadingIndicator.classList.remove('hidden');
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        this.isLoading = false;
        this.elements.loadingIndicator.classList.add('hidden');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.solarApp = new SolarSymmetryApp();
});