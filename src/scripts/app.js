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
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Location search
        this.elements.locationInput.addEventListener('input', (e) => {
            this.handleLocationSearch(e.target.value);
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

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
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
        try {
            // Try to get user's current location
            this.showLoading();
            const location = await this.geocoding.getCurrentLocation();
            this.setCurrentLocation(location);
            this.elements.locationInput.value = location.name;
        } catch (error) {
            console.log('Could not get current location:', error.message);
            // Set a default location (London)
            this.setCurrentLocation({
                lat: 51.5074,
                lng: -0.1278,
                name: 'London, England, United Kingdom'
            });
            this.elements.locationInput.placeholder = 'Enter your city...';
        }

        this.updateMonthDisplay();
        await this.loadMonthData();
        this.hideLoading();
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

        if (locations.length === 0) {
            dropdown.innerHTML = '<div class="location-option">No locations found</div>';
        } else {
            locations.forEach(location => {
                const option = document.createElement('div');
                option.className = 'location-option';
                option.textContent = location.name;
                option.addEventListener('click', () => {
                    this.selectLocation(location);
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
    }

    /**
     * Select a location from search results
     */
    async selectLocation(location) {
        this.elements.locationInput.value = location.name;
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
     * Load month data with twilight times
     */
    async loadMonthData() {
        if (!this.currentLocation) return;

        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth() + 1;
        
        // Get all dates for the month with their mirrors
        const monthData = this.dateCalc.getMonthWithMirrors(year, month);
        
        // Extract all unique dates (current + mirrored) for batch API call
        const allDates = [];
        monthData.forEach(item => {
            allDates.push(item.current);
            allDates.push(item.mirrored);
        });

        try {
            // Fetch twilight times for all dates
            const twilightData = await this.twilight.getBatchTwilightTimes(
                allDates, 
                this.currentLocation.lat, 
                this.currentLocation.lng
            );

            // Combine date data with twilight data
            const enrichedData = monthData.map((item, index) => ({
                ...item,
                currentTwilight: twilightData[index * 2],
                mirroredTwilight: twilightData[index * 2 + 1]
            }));

            this.renderMonthData(enrichedData);
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