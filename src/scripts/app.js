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
        
        // View mode: 'symmetry' or 'cities'
        this.currentView = 'symmetry';
        
        // Cities view data
        this.city1 = null;
        this.city2 = null;
        
        this.initializeElements();
        this.bindEvents();
        this.initializeApp();
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        // View toggle elements
        this.elements = {
            // View toggle buttons
            symmetryViewBtn: document.getElementById('symmetryViewBtn'),
            citiesViewBtn: document.getElementById('citiesViewBtn'),
            
            // Symmetry view elements
            symmetryLocationSelector: document.getElementById('symmetryLocationSelector'),
            locationInput: document.getElementById('locationInput'),
            locationDropdown: document.getElementById('locationDropdown'),
            symmetryContainer: document.getElementById('symmetryContainer'),
            currentDates: document.getElementById('currentDates'),
            mirroredDates: document.getElementById('mirroredDates'),
            
            // Cities view elements
            citiesLocationSelector: document.getElementById('citiesLocationSelector'),
            city1Input: document.getElementById('city1Input'),
            city1Dropdown: document.getElementById('city1Dropdown'),
            city2Input: document.getElementById('city2Input'),
            city2Dropdown: document.getElementById('city2Dropdown'),
            citiesContainer: document.getElementById('citiesContainer'),
            city1Header: document.getElementById('city1Header'),
            city2Header: document.getElementById('city2Header'),
            city1Dates: document.getElementById('city1Dates'),
            city2Dates: document.getElementById('city2Dates'),
            
            // Shared elements
            currentMonth: document.getElementById('currentMonth'),
            prevMonth: document.getElementById('prevMonth'),
            nextMonth: document.getElementById('nextMonth'),
            loadingIndicator: document.getElementById('loadingIndicator')
        };
        
        // Add keyboard navigation state
        this.selectedLocationIndex = -1;
        this.currentLocations = [];
        
        // City search states
        this.city1SelectedIndex = -1;
        this.city1Locations = [];
        this.city2SelectedIndex = -1;
        this.city2Locations = [];
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // View toggle buttons
        this.elements.symmetryViewBtn.addEventListener('click', () => {
            this.switchToView('symmetry');
        });
        
        this.elements.citiesViewBtn.addEventListener('click', () => {
            this.switchToView('cities');
        });
        
        // Symmetry view - Location search
        this.elements.locationInput.addEventListener('input', (e) => {
            this.handleLocationSearch(e.target.value);
        });
        
        this.elements.locationInput.addEventListener('keydown', (e) => {
            this.handleLocationKeydown(e);
        });

        // Cities view - City 1 search
        this.elements.city1Input.addEventListener('input', (e) => {
            this.handleCitySearch(e.target.value, 1);
        });
        
        this.elements.city1Input.addEventListener('keydown', (e) => {
            this.handleCityKeydown(e, 1);
        });
        
        // Cities view - City 2 search
        this.elements.city2Input.addEventListener('input', (e) => {
            this.handleCitySearch(e.target.value, 2);
        });
        
        this.elements.city2Input.addEventListener('keydown', (e) => {
            this.handleCityKeydown(e, 2);
        });

        // Click outside to close dropdowns
        document.addEventListener('click', (e) => {
            // Close symmetry dropdown
            if (!this.elements.locationInput.contains(e.target) && 
                !this.elements.locationDropdown.contains(e.target)) {
                this.hideLocationDropdown();
            }
            
            // Close city 1 dropdown
            if (!this.elements.city1Input.contains(e.target) && 
                !this.elements.city1Dropdown.contains(e.target)) {
                this.hideCityDropdown(1);
            }
            
            // Close city 2 dropdown
            if (!this.elements.city2Input.contains(e.target) && 
                !this.elements.city2Dropdown.contains(e.target)) {
                this.hideCityDropdown(2);
            }
        });

        // Month navigation
        this.elements.prevMonth.addEventListener('click', () => {
            this.navigateToPreviousMonth();
        });

        this.elements.nextMonth.addEventListener('click', () => {
            this.navigateToNextMonth();
        });

        // Keyboard navigation for months
        document.addEventListener('keydown', (e) => {
            // Don't interfere with text input
            if (e.target.tagName === 'INPUT') return;
            
            if (e.key === 'ArrowLeft' && this.dateCalc.canGoToPreviousMonth(this.currentMonth)) {
                this.navigateToPreviousMonth();
            } else if (e.key === 'ArrowRight' && this.dateCalc.canGoToNextMonth(this.currentMonth)) {
                this.navigateToNextMonth();
            }
        });
    }

    /**
     * Switch between views
     */
    switchToView(view) {
        this.currentView = view;
        
        if (view === 'symmetry') {
            // Update button states
            this.elements.symmetryViewBtn.classList.add('active');
            this.elements.citiesViewBtn.classList.remove('active');
            
            // Show/hide UI elements
            this.elements.symmetryLocationSelector.classList.remove('hidden');
            this.elements.citiesLocationSelector.classList.add('hidden');
            this.elements.symmetryContainer.classList.remove('hidden');
            this.elements.citiesContainer.classList.add('hidden');
            
            // Load data if location is set
            if (this.currentLocation) {
                this.loadMonthData();
            } else {
                this.renderSymmetryEmptyState();
            }
        } else {
            // Update button states
            this.elements.citiesViewBtn.classList.add('active');
            this.elements.symmetryViewBtn.classList.remove('active');
            
            // Show/hide UI elements
            this.elements.citiesLocationSelector.classList.remove('hidden');
            this.elements.symmetryLocationSelector.classList.add('hidden');
            this.elements.citiesContainer.classList.remove('hidden');
            this.elements.symmetryContainer.classList.add('hidden');
            
            // Load data if cities are set
            if (this.city1 && this.city2) {
                this.loadMonthData();
            } else {
                this.renderCitiesEmptyState();
            }
        }
    }

    /**
     * Initialize the application
     */
    async initializeApp() {
        this.updateMonthDisplay();
        
        // Start in symmetry view
        this.switchToView('symmetry');
    }

    // =================================================================
    // LOCATION SEARCH METHODS (SYMMETRY VIEW)
    // =================================================================

    /**
     * Handle keyboard navigation in symmetry location input
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
        this.elements.locationInput.blur();
        this.currentLocation = location;
        this.hideLocationDropdown();
        
        this.showLoading();
        await this.loadMonthData();
        this.hideLoading();
    }

    // =================================================================
    // CITY SEARCH METHODS (CITIES VIEW)
    // =================================================================

    /**
     * Handle city search input
     */
    handleCitySearch(query, cityNumber) {
        if (query.length < 2) {
            this.hideCityDropdown(cityNumber);
            return;
        }

        this.geocoding.searchWithDebounce(query, (results) => {
            this.showCityDropdown(results, cityNumber);
        });
    }

    /**
     * Handle keyboard navigation in city inputs
     */
    handleCityKeydown(e, cityNumber) {
        const dropdown = cityNumber === 1 ? this.elements.city1Dropdown : this.elements.city2Dropdown;
        const selectedIndex = cityNumber === 1 ? this.city1SelectedIndex : this.city2SelectedIndex;
        const locations = cityNumber === 1 ? this.city1Locations : this.city2Locations;
        
        if (dropdown.classList.contains('hidden') || locations.length === 0) {
            return;
        }
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                const newDownIndex = Math.min(selectedIndex + 1, locations.length - 1);
                this.setCitySelectedIndex(cityNumber, newDownIndex);
                this.updateCitySelection(cityNumber);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                const newUpIndex = Math.max(selectedIndex - 1, -1);
                this.setCitySelectedIndex(cityNumber, newUpIndex);
                this.updateCitySelection(cityNumber);
                break;
                
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0) {
                    this.selectCity(locations[selectedIndex], cityNumber);
                }
                const input = cityNumber === 1 ? this.elements.city1Input : this.elements.city2Input;
                input.blur();
                break;
                
            case 'Escape':
                this.hideCityDropdown(cityNumber);
                break;
        }
    }

    /**
     * Set selected index for city dropdown
     */
    setCitySelectedIndex(cityNumber, index) {
        if (cityNumber === 1) {
            this.city1SelectedIndex = index;
        } else {
            this.city2SelectedIndex = index;
        }
    }

    /**
     * Update visual selection in city dropdown
     */
    updateCitySelection(cityNumber) {
        const dropdown = cityNumber === 1 ? this.elements.city1Dropdown : this.elements.city2Dropdown;
        const selectedIndex = cityNumber === 1 ? this.city1SelectedIndex : this.city2SelectedIndex;
        const options = dropdown.querySelectorAll('.location-option');
        
        options.forEach((option, index) => {
            if (index === selectedIndex) {
                option.classList.add('selected');
                option.scrollIntoView({ block: 'nearest' });
            } else {
                option.classList.remove('selected');
            }
        });
    }

    /**
     * Show city search dropdown
     */
    showCityDropdown(locations, cityNumber) {
        const dropdown = cityNumber === 1 ? this.elements.city1Dropdown : this.elements.city2Dropdown;
        dropdown.innerHTML = '';
        
        this.setCitySelectedIndex(cityNumber, -1);
        
        if (cityNumber === 1) {
            this.city1Locations = locations;
        } else {
            this.city2Locations = locations;
        }

        if (locations.length === 0) {
            dropdown.innerHTML = '<div class="location-option">No locations found</div>';
        } else {
            locations.forEach((location, index) => {
                const option = document.createElement('div');
                option.className = 'location-option';
                option.textContent = location.name;
                option.addEventListener('click', () => {
                    this.selectCity(location, cityNumber);
                });
                
                option.addEventListener('mouseenter', () => {
                    this.setCitySelectedIndex(cityNumber, index);
                    this.updateCitySelection(cityNumber);
                });
                
                dropdown.appendChild(option);
            });
        }

        dropdown.classList.remove('hidden');
    }

    /**
     * Hide city dropdown
     */
    hideCityDropdown(cityNumber) {
        const dropdown = cityNumber === 1 ? this.elements.city1Dropdown : this.elements.city2Dropdown;
        dropdown.classList.add('hidden');
        
        this.setCitySelectedIndex(cityNumber, -1);
        
        if (cityNumber === 1) {
            this.city1Locations = [];
        } else {
            this.city2Locations = [];
        }
    }

    /**
     * Select a city from search results
     */
    async selectCity(location, cityNumber) {
        const input = cityNumber === 1 ? this.elements.city1Input : this.elements.city2Input;
        const header = cityNumber === 1 ? this.elements.city1Header : this.elements.city2Header;
        
        input.value = location.name;
        input.blur();
        header.textContent = location.name;
        
        if (cityNumber === 1) {
            this.city1 = location;
        } else {
            this.city2 = location;
        }
        
        this.hideCityDropdown(cityNumber);
        
        // Load data if both cities are selected
        if (this.city1 && this.city2) {
            this.showLoading();
            await this.loadMonthData();
            this.hideLoading();
        }
    }

    // =================================================================
    // MONTH NAVIGATION
    // =================================================================

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

    // =================================================================
    // DATA LOADING
    // =================================================================

    /**
     * Load month data based on current view
     */
    async loadMonthData() {
        if (this.currentView === 'symmetry') {
            await this.loadSymmetryData();
        } else {
            await this.loadCitiesData();
        }
    }

    /**
     * Load symmetry view data
     */
    async loadSymmetryData() {
        if (!this.currentLocation) return;

        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth() + 1;
        
        const monthData = this.dateCalc.getMonthWithMirrors(year, month);
        this.renderSymmetryData(monthData);
        
        try {
            const chunkSize = 5;
            const chunks = [];
            
            for (let i = 0; i < monthData.length; i += chunkSize) {
                chunks.push(monthData.slice(i, i + chunkSize));
            }
            
            for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
                const chunk = chunks[chunkIndex];
                
                const uniqueDates = new Set();
                const dateMap = new Map();
                
                chunk.forEach((item, localIndex) => {
                    const globalIndex = chunkIndex * chunkSize + localIndex;
                    
                    const currentKey = this.formatDateKey(item.current);
                    if (!uniqueDates.has(currentKey)) {
                        uniqueDates.add(currentKey);
                        dateMap.set(currentKey, { date: item.current, indices: [] });
                    }
                    dateMap.get(currentKey).indices.push({ type: 'current', index: globalIndex });
                    
                    const mirroredKey = this.formatDateKey(item.mirrored);
                    if (!uniqueDates.has(mirroredKey)) {
                        uniqueDates.add(mirroredKey);
                        dateMap.set(mirroredKey, { date: item.mirrored, indices: [] });
                    }
                    dateMap.get(mirroredKey).indices.push({ type: 'mirrored', index: globalIndex });
                });
                
                const uniqueDateArray = Array.from(dateMap.values()).map(item => item.date);
                const twilightResults = await this.twilight.getBatchTwilightTimes(
                    uniqueDateArray,
                    this.currentLocation.lat,
                    this.currentLocation.lng
                );
                
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
                
                this.renderSymmetryData(monthData);
                
                if (chunkIndex < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        } catch (error) {
            console.error('Failed to load twilight data:', error);
            this.renderSymmetryData(monthData);
        }
    }

    /**
     * Load cities comparison data
     */
    async loadCitiesData() {
        if (!this.city1 || !this.city2) return;

        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth() + 1;
        
        // Get all dates for the month (no mirroring for cities view)
        const monthDates = this.dateCalc.getMonthDates(year, month);
        
        // Initialize data structure
        const citiesData = monthDates.map(date => ({
            date: date,
            city1Twilight: null,
            city2Twilight: null,
            isToday: this.dateCalc.isToday(date)
        }));
        
        this.renderCitiesData(citiesData);
        
        try {
            const chunkSize = 10; // Can process more since we're not dealing with mirrors
            const chunks = [];
            
            for (let i = 0; i < citiesData.length; i += chunkSize) {
                chunks.push(citiesData.slice(i, i + chunkSize));
            }
            
            for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
                const chunk = chunks[chunkIndex];
                const dates = chunk.map(item => item.date);
                
                // Fetch data for both cities in parallel
                const [city1Results, city2Results] = await Promise.all([
                    this.twilight.getBatchTwilightTimes(dates, this.city1.lat, this.city1.lng),
                    this.twilight.getBatchTwilightTimes(dates, this.city2.lat, this.city2.lng)
                ]);
                
                // Map results back
                chunk.forEach((item, localIndex) => {
                    const globalIndex = chunkIndex * chunkSize + localIndex;
                    citiesData[globalIndex].city1Twilight = city1Results[localIndex];
                    citiesData[globalIndex].city2Twilight = city2Results[localIndex];
                });
                
                this.renderCitiesData(citiesData);
                
                if (chunkIndex < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        } catch (error) {
            console.error('Failed to load cities twilight data:', error);
            this.renderCitiesData(citiesData);
        }
    }

    // =================================================================
    // RENDERING METHODS
    // =================================================================

    /**
     * Render symmetry view data
     */
    renderSymmetryData(monthData) {
        this.renderCurrentColumn(monthData);
        this.renderMirroredColumn(monthData);
    }

    /**
     * Render cities view data
     */
    renderCitiesData(citiesData) {
        this.renderCity1Column(citiesData);
        this.renderCity2Column(citiesData);
    }

    /**
     * Render current month column (symmetry view)
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
     * Render mirrored dates column (symmetry view)
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
     * Render city 1 column (cities view)
     */
    renderCity1Column(citiesData) {
        const container = this.elements.city1Dates;
        container.innerHTML = '';

        citiesData.forEach(item => {
            const dateElement = this.createDateElement(
                item.date, 
                item.city1Twilight, 
                item.isToday
            );
            container.appendChild(dateElement);
        });
    }

    /**
     * Render city 2 column (cities view)
     */
    renderCity2Column(citiesData) {
        const container = this.elements.city2Dates;
        container.innerHTML = '';

        citiesData.forEach(item => {
            const dateElement = this.createDateElement(
                item.date, 
                item.city2Twilight, 
                item.isToday
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
        } else if (twilightData && twilightData.error) {
            twilightTimes.innerHTML = '<div class="twilight-time error">API Error</div>';
        } else {
            twilightTimes.innerHTML = '<div class="twilight-time">Loading...</div>';
        }

        element.appendChild(dateHeader);
        element.appendChild(twilightTimes);

        return element;
    }

    // =================================================================
    // EMPTY STATE RENDERING
    // =================================================================

    /**
     * Render symmetry view empty state
     */
    renderSymmetryEmptyState() {
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
     * Render cities view empty state
     */
    renderCitiesEmptyState() {
        const city1Container = this.elements.city1Dates;
        const city2Container = this.elements.city2Dates;
        
        const city1Empty = document.createElement('div');
        city1Empty.className = 'empty-state';
        city1Empty.innerHTML = `
            <div class="empty-icon">🌍</div>
            <p>Select your first city above</p>
            <small>Choose any city worldwide</small>
        `;
        
        const city2Empty = document.createElement('div');
        city2Empty.className = 'empty-state';
        city2Empty.innerHTML = `
            <div class="empty-icon">🏙️</div>
            <p>Select your second city above</p>
            <small>Compare sun times side by side</small>
        `;
        
        city1Container.innerHTML = '';
        city2Container.innerHTML = '';
        city1Container.appendChild(city1Empty);
        city2Container.appendChild(city2Empty);
    }

    // =================================================================
    // UTILITY METHODS
    // =================================================================

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
