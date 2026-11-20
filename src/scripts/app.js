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

        // Active month load: aborting it cancels queued/in-flight API requests
        this.loadController = null;
        // State of the current symmetry-view load (per-date success/failure tracking)
        this.symmetryLoad = null;
        // "Couldn't load N dates" status lines, one per symmetry column
        this.columnStatus = { current: null, mirrored: null };
        // Data loads still running (incl. background stages and retries); see whenIdle()
        this.pendingLoads = new Set();
        this.showGoldenHour = false; // Golden hour toggle state
        
        // View mode: 'symmetry', 'cities', or 'mobileApp'
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
            mobileAppBtn: document.getElementById('mobileAppBtn'),
            
            // Symmetry view elements
            symmetryLocationSelector: document.getElementById('symmetryLocationSelector'),
            locationInput: document.getElementById('locationInput'),
            locationClearBtn: document.getElementById('locationClearBtn'),
            locationDropdown: document.getElementById('locationDropdown'),
            appVersion: document.getElementById('appVersion'),
            symmetryContainer: document.getElementById('symmetryContainer'),
            todayHero: document.getElementById('todayHero'),
            heroCity: document.getElementById('heroCity'),
            heroTodayDate: document.getElementById('heroTodayDate'),
            heroTodayTimes: document.getElementById('heroTodayTimes'),
            heroMirrorDate: document.getElementById('heroMirrorDate'),
            heroMirrorTimes: document.getElementById('heroMirrorTimes'),
            heroMessage: document.getElementById('heroMessage'),
            currentDates: document.getElementById('currentDates'),
            mirroredDates: document.getElementById('mirroredDates'),
            
            // Cities view elements
            citiesLocationSelector: document.getElementById('citiesLocationSelector'),
            city1Input: document.getElementById('city1Input'),
            city1ClearBtn: document.getElementById('city1ClearBtn'),
            city1Dropdown: document.getElementById('city1Dropdown'),
            city2Input: document.getElementById('city2Input'),
            city2ClearBtn: document.getElementById('city2ClearBtn'),
            city2Dropdown: document.getElementById('city2Dropdown'),
            citiesContainer: document.getElementById('citiesContainer'),
            city1Header: document.getElementById('city1Header'),
            city2Header: document.getElementById('city2Header'),
            city1Dates: document.getElementById('city1Dates'),
            city2Dates: document.getElementById('city2Dates'),
            
            // Mobile app view elements
            mobileAppContainer: document.getElementById('mobileAppContainer'),
            
            // Shared elements
            currentMonth: document.getElementById('currentMonth'),
            prevMonth: document.getElementById('prevMonth'),
            nextMonth: document.getElementById('nextMonth'),
            goldenHourToggle: document.getElementById('goldenHourToggle'),
            lightAfterWorkCard: document.getElementById('lightAfterWorkCard'),
            lightAfterWorkTitle: document.getElementById('lightAfterWorkTitle'),
            lightAfterWorkMessage: document.getElementById('lightAfterWorkMessage'),
            lightAfterWorkCountdown: document.getElementById('lightAfterWorkCountdown'),
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
        
        this.elements.mobileAppBtn.addEventListener('click', () => {
            this.switchToView('mobileApp');
        });

        // The native app is already installed: no "install the web app" tab there
        if (isNativeApp()) {
            this.elements.mobileAppBtn.classList.add('hidden');
        }
        
        // Symmetry view - Location search
        this.elements.locationInput.addEventListener('input', (e) => {
            this.handleLocationSearch(e.target.value);
            this.toggleClearButton(this.elements.locationClearBtn, e.target.value);
        });
        
        this.elements.locationInput.addEventListener('keydown', (e) => {
            this.handleLocationKeydown(e);
        });
        
        // Clear button for location input
        this.elements.locationClearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearLocationInput();
        });

        // Cities view - City 1 search
        this.elements.city1Input.addEventListener('input', (e) => {
            this.handleCitySearch(e.target.value, 1);
            this.toggleClearButton(this.elements.city1ClearBtn, e.target.value);
        });
        
        this.elements.city1Input.addEventListener('keydown', (e) => {
            this.handleCityKeydown(e, 1);
        });
        
        // Clear button for city 1 input
        this.elements.city1ClearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearCityInput(1);
        });
        
        // Cities view - City 2 search
        this.elements.city2Input.addEventListener('input', (e) => {
            this.handleCitySearch(e.target.value, 2);
            this.toggleClearButton(this.elements.city2ClearBtn, e.target.value);
        });
        
        this.elements.city2Input.addEventListener('keydown', (e) => {
            this.handleCityKeydown(e, 2);
        });
        
        // Clear button for city 2 input
        this.elements.city2ClearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearCityInput(2);
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
        
        // Golden hour toggle
        this.elements.goldenHourToggle.addEventListener('click', () => {
            this.toggleGoldenHour();
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
            this.elements.mobileAppBtn.classList.remove('active');
            
            // Show/hide UI elements
            this.elements.symmetryLocationSelector.classList.remove('hidden');
            this.elements.citiesLocationSelector.classList.add('hidden');
            this.elements.symmetryContainer.classList.remove('hidden');
            this.elements.citiesContainer.classList.add('hidden');
            this.elements.mobileAppContainer.classList.add('hidden');
            
            // Load data if location is set
            if (this.currentLocation) {
                return this.loadMonthData();
            } else {
                this.renderSymmetryEmptyState();
            }
        } else if (view === 'cities') {
            // Update button states
            this.elements.citiesViewBtn.classList.add('active');
            this.elements.symmetryViewBtn.classList.remove('active');
            this.elements.mobileAppBtn.classList.remove('active');
            
            // Show/hide UI elements
            this.elements.citiesLocationSelector.classList.remove('hidden');
            this.elements.symmetryLocationSelector.classList.add('hidden');
            this.elements.citiesContainer.classList.remove('hidden');
            this.elements.symmetryContainer.classList.add('hidden');
            this.elements.todayHero.classList.add('hidden');
            this.elements.mobileAppContainer.classList.add('hidden');
            
            // Load data if cities are set
            if (this.city1 && this.city2) {
                return this.loadMonthData();
            } else {
                this.renderCitiesEmptyState();
            }
        } else if (view === 'mobileApp') {
            // Update button states
            this.elements.mobileAppBtn.classList.add('active');
            this.elements.symmetryViewBtn.classList.remove('active');
            this.elements.citiesViewBtn.classList.remove('active');
            
            // Show/hide UI elements
            this.elements.symmetryLocationSelector.classList.add('hidden');
            this.elements.citiesLocationSelector.classList.add('hidden');
            this.elements.symmetryContainer.classList.add('hidden');
            this.elements.citiesContainer.classList.add('hidden');
            this.elements.mobileAppContainer.classList.remove('hidden');
            this.elements.todayHero.classList.add('hidden');
        }
    }

    /**
     * Initialize the application
     */
    async initializeApp() {
        this.updateMonthDisplay();

        // Display app version
        if (this.elements.appVersion && window.APP_VERSION) {
            this.elements.appVersion.textContent = `v${window.APP_VERSION}`;
        }

        // Load saved locations from localStorage
        this.loadSavedLocations();

        // Start in symmetry view (this is the only place the month loads on startup)
        const loading = this.switchToView('symmetry');

        // First screen is drawn (Today card + month, all calculated on the device):
        // the native app can now fade out its launch screen
        Promise.resolve(loading).finally(onAppReady);

        // Light-after-work starts once today's data is in (it then comes from the cache)
        if (this.currentLocation) {
            await loading;
            this.updateLightAfterWorkTimer();
        }
    }

    /**
     * Load saved locations from localStorage
     */
    loadSavedLocations() {
        try {
            // Load symmetry location
            const savedLocation = localStorage.getItem('solarSymmetry_location');
            if (savedLocation) {
                this.currentLocation = JSON.parse(savedLocation);
                this.elements.locationInput.value = this.currentLocation.name;
                this.elements.locationClearBtn.classList.remove('hidden');
                // Data is loaded by initializeApp → switchToView, not here
                // (loading here as well used to double the requests and trigger HTTP 429s)
            }
            
            // Load city 1
            const savedCity1 = localStorage.getItem('solarSymmetry_city1');
            if (savedCity1) {
                this.city1 = JSON.parse(savedCity1);
                this.elements.city1Input.value = this.city1.name;
                this.elements.city1ClearBtn.classList.remove('hidden');
                this.elements.city1Header.textContent = this.city1.name;
            }
            
            // Load city 2
            const savedCity2 = localStorage.getItem('solarSymmetry_city2');
            if (savedCity2) {
                this.city2 = JSON.parse(savedCity2);
                this.elements.city2Input.value = this.city2.name;
                this.elements.city2ClearBtn.classList.remove('hidden');
                this.elements.city2Header.textContent = this.city2.name;
            }
        } catch (error) {
            console.error('Failed to load saved locations:', error);
        }
    }

    /**
     * Save location to localStorage
     */
    saveLocation(location, type = 'location') {
        try {
            const key = type === 'location' 
                ? 'solarSymmetry_location' 
                : type === 'city1'
                    ? 'solarSymmetry_city1'
                    : 'solarSymmetry_city2';
            
            localStorage.setItem(key, JSON.stringify(location));
        } catch (error) {
            console.error('Failed to save location:', error);
        }
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
        
        // Save to localStorage
        this.saveLocation(location, 'location');
        
        this.showLoading();
        // Resolves once today + mirror are shown; the rest of the month keeps loading
        const isCurrent = await this.loadMonthData();
        if (isCurrent) {
            this.hideLoading();
            this.updateLightAfterWorkTimer();
        }
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
            this.saveLocation(location, 'city1');
        } else {
            this.city2 = location;
            this.saveLocation(location, 'city2');
        }
        
        this.hideCityDropdown(cityNumber);
        
        // Load data if both cities are selected
        if (this.city1 && this.city2) {
            this.showLoading();
            if (await this.loadMonthData()) {
                this.hideLoading();
            }
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
        if (await this.loadMonthData()) {
            this.hideLoading();
        }
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
        if (await this.loadMonthData()) {
            this.hideLoading();
        }
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
     * Toggle golden hour display
     */
    toggleGoldenHour() {
        this.showGoldenHour = !this.showGoldenHour;
        
        // Update button appearance
        if (this.showGoldenHour) {
            this.elements.goldenHourToggle.classList.add('active');
        } else {
            this.elements.goldenHourToggle.classList.remove('active');
        }
        
        // Just toggle visibility of existing golden hour elements
        const goldenHourElements = document.querySelectorAll('.twilight-time.golden-hour');
        goldenHourElements.forEach((element, index) => {
            if (this.showGoldenHour) {
                element.classList.remove('hidden');
                // Smooth fade in with stagger
                if (window.anime) {
                    anime({
                        targets: element,
                        opacity: [0, 1],
                        maxHeight: ['0px', element.scrollHeight + 'px'],
                        duration: 300,
                        delay: index * 15,
                        easing: 'easeOutQuad'
                    });
                }
            } else {
                element.classList.add('hidden');
            }
        });
    }
    
    /**
     * Calculate and display light after work countdown
     */
    async updateLightAfterWorkTimer() {
        if (!this.currentLocation) {
            this.elements.lightAfterWorkCard.classList.add('hidden');
            return;
        }
        
        const today = new Date();
        const targetTime = '17:00'; // 5pm
        const location = this.currentLocation;

        try {
            // Get today's sunset
            const todayData = await this.twilight.getTwilightTimes(
                today,
                location.lat,
                location.lng
            );

            // Location changed while waiting: don't show stale data
            if (this.currentLocation !== location) return;

            const todaySunsetTime = todayData.sunset;
            
            // Check if we currently have light after 5pm
            const sunsetHour = parseInt(todaySunsetTime.split(':')[0]);
            const sunsetMinute = parseInt(todaySunsetTime.split(':')[1]);
            const sunsetTotalMinutes = sunsetHour * 60 + sunsetMinute;
            const targetMinutes = 17 * 60; // 5pm
            
            if (sunsetTotalMinutes > targetMinutes) {
                // We currently have light after work!
                this.showLightAfterWorkCountdown(today, todayData, true);
            } else {
                // Find when light returns after work
                this.findWhenLightReturns(targetMinutes, location);
            }
            
        } catch (error) {
            console.error('Failed to calculate light after work:', error);
            this.elements.lightAfterWorkCard.classList.add('hidden');
        }
    }
    
    /**
     * Find when sunset will be after target time
     */
    async findWhenLightReturns(targetMinutes, location = this.currentLocation) {
        const today = new Date();
        const searchLimit = 365; // Search up to 1 year ahead

        for (let daysAhead = 1; daysAhead < searchLimit; daysAhead++) {
            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + daysAhead);

            const futureData = await this.twilight.getTwilightTimes(
                futureDate,
                location.lat,
                location.lng
            );

            // Location changed while searching: stop, the new search owns the card
            if (this.currentLocation !== location) return;

            const sunsetTime = futureData.sunset;
            const sunsetHour = parseInt(sunsetTime.split(':')[0]);
            const sunsetMinute = parseInt(sunsetTime.split(':')[1]);
            const sunsetTotalMinutes = sunsetHour * 60 + sunsetMinute;
            
            if (sunsetTotalMinutes > targetMinutes) {
                // Found it!
                this.showLightAfterWorkCountdown(futureDate, futureData, false);
                return;
            }
            
            // Check every 7 days for efficiency
            if (daysAhead < 30) {
                daysAhead += 6; // Will increment by 1 in loop, so effectively +7
            } else {
                daysAhead += 13; // Check every 2 weeks after a month
            }
        }
        
        // If we didn't find it, hide the card
        this.elements.lightAfterWorkCard.classList.add('hidden');
    }
    
    /**
     * Display light after work countdown
     */
    showLightAfterWorkCountdown(targetDate, twilightData, hasLightNow) {
        this.elements.lightAfterWorkCard.classList.remove('hidden');
        
        if (hasLightNow) {
            // Currently have light
            this.elements.lightAfterWorkTitle.textContent = 'Light After Work';
            this.elements.lightAfterWorkMessage.textContent = 'Sunset today at ' + twilightData.sunset;
            this.elements.lightAfterWorkCountdown.textContent = 'Enjoy the daylight';
            this.elements.lightAfterWorkCard.classList.add('has-light');
        } else {
            // Countdown to light return
            const today = new Date();
            const daysUntil = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
            
            this.elements.lightAfterWorkTitle.textContent = 'Light Returns After Work';
            this.elements.lightAfterWorkMessage.textContent = 'Sunset will be after 5pm on ' + this.dateCalc.formatDate(targetDate);
            this.elements.lightAfterWorkCountdown.textContent = daysUntil + ' days';
            this.elements.lightAfterWorkCard.classList.remove('has-light');
            
            // Animate countdown
            if (window.anime) {
                anime({
                    targets: this.elements.lightAfterWorkCountdown,
                    scale: [1.1, 1],
                    opacity: [0, 1],
                    duration: 800,
                    easing: 'easeOutElastic(1, .6)'
                });
            }
        }
    }

    // =================================================================
    // TODAY HERO
    // =================================================================

    /**
     * Fetch today and today's mirror date, then render the hero card.
     * Both dates go in one call (two small range requests through the shared queue).
     */
    async loadTodayHero(state) {
        const { location, signal } = state;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const mirror = this.dateCalc.calculateMirrorDate(today);

        this.renderTodayHero(location, today, mirror, null, null);

        try {
            const results = await this.twilight.getTwilightRange([today, mirror], location.lat, location.lng, { signal });
            if (signal.aborted || this.symmetryLoad !== state) return;

            const pick = date => {
                const result = results.get(this.twilight.formatDateForAPI(date));
                if (!result) return null;
                return result.data || { error: result.error ? result.error.message : 'Failed to load' };
            };
            this.renderTodayHero(location, today, mirror, pick(today), pick(mirror));
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Failed to load today hero:', error);
            }
        }
    }

    renderTodayHero(location, today, mirror, todayData, mirrorData) {
        const el = this.elements;
        el.todayHero.classList.remove('hidden');
        el.heroCity.textContent = (location.name || '').split(',')[0];

        const longDate = date => date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
        el.heroTodayDate.textContent = longDate(today);
        el.heroMirrorDate.textContent = longDate(mirror);

        el.heroTodayTimes.innerHTML = this.heroTimesHTML(todayData);
        el.heroMirrorTimes.innerHTML = this.heroTimesHTML(mirrorData);
        el.heroMessage.textContent = this.heroMessage(today, mirror, todayData);

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    heroTimesHTML(data) {
        if (!data) {
            return '<div class="hero-loading">Loading…</div>';
        }
        if (data.error) {
            return '<div class="hero-loading">Couldn\'t load</div>';
        }
        const daylight = this.formatDaylight(data);
        return `
            <div class="hero-row"><i data-lucide="sunrise"></i><span>Sunrise</span><strong>${data.sunrise}</strong></div>
            <div class="hero-row"><i data-lucide="sunset"></i><span>Sunset</span><strong>${data.sunset}</strong></div>
            ${daylight ? `<div class="hero-row hero-daylight"><i data-lucide="sun"></i><span>Daylight</span><strong>${daylight}</strong></div>` : ''}
        `;
    }

    /**
     * Daylight length from the ISO sunrise/sunset times, e.g. "8h 05m"
     */
    formatDaylight(data) {
        if (!data.sunriseISO || !data.sunsetISO) return null;
        const minutes = Math.round((new Date(data.sunsetISO) - new Date(data.sunriseISO)) / 60000);
        if (!Number.isFinite(minutes) || minutes <= 0) return null;
        return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
    }

    /**
     * A short, warm line about where we are in the year
     */
    heroMessage(today, mirror, todayData) {
        const dayMs = 24 * 60 * 60 * 1000;
        const solstice = this.dateCalc.getNearestSolstice(today);
        const days = Math.round((solstice - today) / dayMs); // > 0: solstice still ahead
        const isWinter = solstice.getMonth() === 11;
        const mirrorText = mirror.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

        if (days === 0) {
            return isWinter
                ? 'The shortest day. From tomorrow, the light starts coming back.'
                : 'The longest day. Get outside and soak it up.';
        }

        if (isWinter) {
            if (days > 0) {
                return `${days} day${days === 1 ? '' : 's'} until the shortest day. After that the light turns, and by ${mirrorText} you'll have today's light again. Hang in there.`;
            }
            return `You made it past the darkest day. Today's light matches ${mirrorText}, and every day from here gets a little longer.`;
        }

        if (days > 0) {
            return `${days} day${days === 1 ? '' : 's'} until the longest day. Long, light evenings ahead.`;
        }
        return `The days are slowly shortening, but today still has the same light as ${mirrorText}. Make the most of it.`;
    }

    // =================================================================
    // DATA LOADING
    // =================================================================

    /**
     * Load month data based on current view.
     * Any load already running is cancelled first, so stale data never overwrites new data.
     * @returns {Promise<boolean>} - false if this load was superseded by a newer one
     */
    async loadMonthData() {
        this.cancelActiveLoad();

        const controller = new AbortController();
        this.loadController = controller;

        try {
            const load = this.currentView === 'symmetry'
                ? this.loadSymmetryData(controller.signal)
                : this.loadCitiesData(controller.signal);
            await this.trackLoad(load);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Failed to load month data:', error);
            }
        }

        return !controller.signal.aborted;
    }

    /**
     * Register a running data load so whenIdle() waits for it
     */
    trackLoad(promise) {
        this.pendingLoads.add(promise);
        const remove = () => this.pendingLoads.delete(promise);
        promise.then(remove, remove);
        return promise;
    }

    /**
     * Resolves once no data is loading (used before reloading for an app update)
     */
    async whenIdle() {
        while (this.pendingLoads.size > 0) {
            await Promise.allSettled(Array.from(this.pendingLoads));
        }
    }

    /**
     * Cancel the running month load (queued and in-flight requests are dropped)
     */
    cancelActiveLoad() {
        if (this.loadController) {
            this.loadController.abort();
            this.loadController = null;
        }
        this.symmetryLoad = null;
    }

    /**
     * Load symmetry view data. First the Today hero (today vs. its mirror date),
     * then the month list in three stages (today's row is then served from the cache):
     *   1. today + today's mirror
     *   2. rows after today to the end of the month (current column, then mirrored)
     *   3. rows from the 1st up to the day before today (current column, then mirrored)
     * Resolves after the hero and stage 1; stages 2 and 3 keep loading in the background.
     * When viewing another month, "today" is today's day number capped at that month's length.
     */
    async loadSymmetryData(signal) {
        if (!this.currentLocation) return;

        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth() + 1;
        const location = this.currentLocation;

        const monthData = this.dateCalc.getMonthWithMirrors(year, month);
        const daysInMonth = monthData.length; // real month length (28–31)

        const state = {
            signal,
            location,
            monthData,
            // Row indexes whose date failed to load, per column
            failed: { current: new Set(), mirrored: new Set() }
        };
        this.symmetryLoad = state;

        // Fill anything already cached so it shows immediately
        monthData.forEach(item => {
            item.currentTwilight = this.twilight.getCachedTwilight(item.current, location.lat, location.lng);
            item.mirroredTwilight = this.twilight.getCachedTwilight(item.mirrored, location.lat, location.lng);
        });

        this.clearColumnStatus();
        this.renderSymmetryData(monthData);

        // 0. Hero first: today + today's mirror (always the real today, whatever month is shown)
        await this.loadTodayHero(state);
        if (signal.aborted) return;

        const anchor = Math.min(new Date().getDate(), daysInMonth) - 1; // row index
        const rowRange = (from, to) => Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i);

        const stages = [
            [anchor],                              // 1. today + mirror
            rowRange(anchor + 1, daysInMonth),     // 2. rest of month (empty on the last day)
            rowRange(0, anchor)                    // 3. start of month (empty on the 1st)
        ].filter(rows => rows.length > 0);

        await this.loadSymmetryRows(state, stages[0]);
        if (signal.aborted) return;

        // Stages 2 and 3 run in order, in the background
        this.trackLoad((async () => {
            for (const rows of stages.slice(1)) {
                if (signal.aborted) return;
                await this.loadSymmetryRows(state, rows);
            }
        })().catch(error => {
            if (error.name !== 'AbortError') {
                console.error('Failed to load twilight data:', error);
            }
        }));
    }

    /**
     * Fetch and render the given rows: current column first, then mirrored column.
     * Each column renders as soon as its own data arrives.
     */
    async loadSymmetryRows(state, rows) {
        await Promise.all([
            this.loadSymmetryColumn(state, 'current', rows),
            this.loadSymmetryColumn(state, 'mirrored', rows)
        ]);
    }

    async loadSymmetryColumn(state, column, rows) {
        const { monthData, location, signal } = state;
        const dates = rows.map(i => column === 'current' ? monthData[i].current : monthData[i].mirrored);

        try {
            const results = await this.twilight.getTwilightRange(dates, location.lat, location.lng, { signal });
            if (signal.aborted || this.symmetryLoad !== state) return;
            this.applySymmetryResults(state, column, rows, results);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error(`Failed to load ${column} column:`, error);
            }
        }
    }

    /**
     * Put fetched results into the matching cards, tracking failures per date
     */
    applySymmetryResults(state, column, rows, results) {
        const field = column === 'current' ? 'currentTwilight' : 'mirroredTwilight';
        const changedCards = [];

        rows.forEach(index => {
            const item = state.monthData[index];
            const date = column === 'current' ? item.current : item.mirrored;
            const result = results.get(this.twilight.formatDateForAPI(date));
            if (!result) return;

            if (result.data) {
                state.failed[column].delete(index);
                // Already showing this exact data (from cache): leave the card alone
                if (item[field] === result.data) return;
                item[field] = result.data;
            } else {
                state.failed[column].add(index);
                item[field] = { error: result.error ? result.error.message : 'Failed to load' };
            }

            changedCards.push(this.updateSymmetryCard(column, index, item));
        });

        if (changedCards.length > 0) {
            if (window.lucide) {
                window.lucide.createIcons();
            }
            this.animateCards(changedCards.filter(Boolean));
        }

        this.updateColumnStatus(state, column);
    }

    /**
     * Replace one card in place (other cards are not touched)
     */
    updateSymmetryCard(column, index, item) {
        const container = column === 'current' ? this.elements.currentDates : this.elements.mirroredDates;
        const oldCard = container.children[index];
        if (!oldCard) return null;

        const newCard = column === 'current'
            ? this.createDateElement(item.current, item.currentTwilight, item.isToday)
            : this.createDateElement(item.mirrored, item.mirroredTwilight, false);

        if (!window.anime) {
            newCard.style.opacity = '';
            newCard.style.transform = '';
        }

        container.replaceChild(newCard, oldCard);
        return newCard;
    }

    /**
     * Show / update / remove the "Couldn't load N dates" line for a column
     */
    updateColumnStatus(state, column) {
        const failedCount = state.failed[column].size;
        let status = this.columnStatus[column];

        if (failedCount === 0) {
            if (status) {
                status.remove();
                this.columnStatus[column] = null;
            }
            return;
        }

        if (!status) {
            const container = column === 'current' ? this.elements.currentDates : this.elements.mirroredDates;
            status = document.createElement('div');
            status.className = 'load-status';
            status.setAttribute('role', 'status');
            status.innerHTML = `
                <span class="load-status-text"></span>
                <button type="button" class="load-status-retry">Retry</button>
            `;
            container.parentElement.insertBefore(status, container);
            this.columnStatus[column] = status;
        }

        const button = status.querySelector('.load-status-retry');
        status.querySelector('.load-status-text').textContent =
            `Couldn't load ${failedCount} date${failedCount === 1 ? '' : 's'}`;
        button.disabled = false;
        button.textContent = 'Retry';
        button.onclick = () => this.retryFailedDates(state, column);
    }

    /**
     * Remove both column status lines
     */
    clearColumnStatus() {
        ['current', 'mirrored'].forEach(column => {
            if (this.columnStatus[column]) {
                this.columnStatus[column].remove();
                this.columnStatus[column] = null;
            }
        });
    }

    /**
     * Re-fetch only the dates that failed in this column
     */
    async retryFailedDates(state, column) {
        if (this.symmetryLoad !== state || state.signal.aborted) return;

        const rows = Array.from(state.failed[column]).sort((a, b) => a - b);
        if (rows.length === 0) return;

        const status = this.columnStatus[column];
        if (status) {
            const button = status.querySelector('.load-status-retry');
            button.disabled = true;
            button.textContent = 'Retrying…';
        }

        // Put the failed cards back into their loading state
        const field = column === 'current' ? 'currentTwilight' : 'mirroredTwilight';
        rows.forEach(index => {
            state.monthData[index][field] = null;
            const card = this.updateSymmetryCard(column, index, state.monthData[index]);
            if (card) {
                card.style.opacity = '';
                card.style.transform = '';
            }
        });

        await this.trackLoad(this.loadSymmetryColumn(state, column, rows));
    }

    /**
     * Load cities comparison data
     */
    async loadCitiesData(signal) {
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

                // A newer load started (city/month/view changed): drop these results
                if (signal && signal.aborted) return;

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
            if (!(signal && signal.aborted)) {
                this.renderCitiesData(citiesData);
            }
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
        
        // Animate all cards with stagger
        this.animateCardEntrance(container);
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
        
        // Animate all cards with stagger
        this.animateCardEntrance(container);
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

        // Animate all cards with stagger
        this.animateCardEntrance(container);
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

        // Animate all cards with stagger
        this.animateCardEntrance(container);
    }

    /**
     * Create a date element with all twilight and sun times
     */
    createDateElement(date, twilightData, isToday = false) {
        const element = document.createElement('div');
        element.className = `date-item ${isToday ? 'today' : ''}`;
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';

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
                <i data-lucide="sunrise" class="time-icon"></i>
                <div>
                    <div class="time-label">Dawn</div>
                    <div>${twilightData.dawn}</div>
                </div>
            `;
            
            // Golden Hour Morning (if enabled)
            const goldenHourMorning = document.createElement('div');
            goldenHourMorning.className = `twilight-time golden-hour ${this.showGoldenHour ? '' : 'hidden'}`;
            goldenHourMorning.innerHTML = `
                <i data-lucide="camera" class="time-icon"></i>
                <div>
                    <div class="time-label">Golden AM</div>
                    <div>${twilightData.goldenHourMorningStart || 'N/A'} – ${twilightData.goldenHourMorningEnd || 'N/A'}</div>
                </div>
            `;

            // Sunrise
            const sunriseTime = document.createElement('div');
            sunriseTime.className = 'twilight-time';
            sunriseTime.innerHTML = `
                <i data-lucide="sun" class="time-icon"></i>
                <div>
                    <div class="time-label">Sunrise</div>
                    <div>${twilightData.sunrise}</div>
                </div>
            `;

            // Sunset
            const sunsetTime = document.createElement('div');
            sunsetTime.className = 'twilight-time';
            sunsetTime.innerHTML = `
                <i data-lucide="sun" class="time-icon"></i>
                <div>
                    <div class="time-label">Sunset</div>
                    <div>${twilightData.sunset}</div>
                </div>
            `;
            
            // Golden Hour Evening (if enabled)
            const goldenHourEvening = document.createElement('div');
            goldenHourEvening.className = `twilight-time golden-hour ${this.showGoldenHour ? '' : 'hidden'}`;
            goldenHourEvening.innerHTML = `
                <i data-lucide="camera" class="time-icon"></i>
                <div>
                    <div class="time-label">Golden PM</div>
                    <div>${twilightData.goldenHourEveningStart || 'N/A'} – ${twilightData.goldenHourEveningEnd || 'N/A'}</div>
                </div>
            `;

            // Dusk (Civil Twilight End)
            const duskTime = document.createElement('div');
            duskTime.className = 'twilight-time';
            duskTime.innerHTML = `
                <i data-lucide="sunset" class="time-icon"></i>
                <div>
                    <div class="time-label">Dusk</div>
                    <div>${twilightData.dusk}</div>
                </div>
            `;

            twilightTimes.appendChild(dawnTime);
            twilightTimes.appendChild(goldenHourMorning);
            twilightTimes.appendChild(sunriseTime);
            twilightTimes.appendChild(sunsetTime);
            twilightTimes.appendChild(goldenHourEvening);
            twilightTimes.appendChild(duskTime);
            
            // Re-initialize Lucide icons for dynamically added content
            if (window.lucide) {
                window.lucide.createIcons();
            }
        } else if (twilightData && twilightData.error) {
            twilightTimes.innerHTML = '<div class="twilight-time error">API Error</div>';
        } else {
            twilightTimes.innerHTML = '<div class="twilight-time">Loading...</div>';
        }

        element.appendChild(dateHeader);
        element.appendChild(twilightTimes);
        
        return element;
    }
    
    /**
     * Animate card entrance with stagger effect
     */
    animateCardEntrance(container) {
        this.animateCards(container.querySelectorAll('.date-item'));
    }

    /**
     * Animate a set of cards in (used for whole columns and for single updated cards)
     */
    animateCards(cards) {
        if (cards.length === 0) return;

        // No animation library (e.g. offline, CDN blocked): just show the cards
        if (!window.anime) {
            Array.from(cards).forEach(card => {
                card.style.opacity = '';
                card.style.transform = '';
            });
            return;
        }

        anime({
            targets: cards,
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 500,
            delay: anime.stagger(50), // 50ms delay between each card
            easing: 'easeOutCubic'
        });
        
        // Add subtle pulse to golden hour times if visible
        const goldenHourTimes = Array.from(cards).flatMap(card =>
            Array.from(card.querySelectorAll('.twilight-time.golden-hour:not(.hidden)'))
        );
        if (goldenHourTimes.length > 0) {
            setTimeout(() => {
                anime({
                    targets: goldenHourTimes,
                    scale: [1, 1.05, 1],
                    opacity: [1, 0.9, 1],
                    duration: 1500,
                    delay: anime.stagger(100),
                    easing: 'easeInOutSine',
                    loop: 2
                });
            }, 800);
        }
    }

    // =================================================================
    // EMPTY STATE RENDERING
    // =================================================================

    /**
     * Render symmetry view empty state
     */
    renderSymmetryEmptyState() {
        this.clearColumnStatus();
        this.elements.todayHero.classList.add('hidden');

        const currentContainer = this.elements.currentDates;
        const mirroredContainer = this.elements.mirroredDates;
        
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-state';
        emptyMessage.innerHTML = `
            <div class="empty-icon"><i data-lucide="sun" style="width: 48px; height: 48px;"></i></div>
            <p>Search for your city above to discover solar symmetry patterns</p>
            <small>See how dates mirror around solstices with identical twilight times</small>
        `;
        
        // Re-initialize Lucide icons
        if (window.lucide) {
            setTimeout(() => window.lucide.createIcons(), 0);
        }
        
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
            <div class="empty-icon"><i data-lucide="globe" style="width: 48px; height: 48px;"></i></div>
            <p>Select your first city above</p>
            <small>Choose any city worldwide</small>
        `;
        
        const city2Empty = document.createElement('div');
        city2Empty.className = 'empty-state';
        city2Empty.innerHTML = `
            <div class="empty-icon"><i data-lucide="map-pin" style="width: 48px; height: 48px;"></i></div>
            <p>Select your second city above</p>
            <small>Compare sun times side by side</small>
        `;
        
        // Re-initialize Lucide icons
        if (window.lucide) {
            setTimeout(() => window.lucide.createIcons(), 0);
        }
        
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
        // Local calendar date (toISOString() gave the previous day during BST)
        return this.twilight.formatDateForAPI(date);
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

    /**
     * Toggle visibility of clear button based on input value
     */
    toggleClearButton(clearBtn, value) {
        if (value && value.length > 0) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }
    }

    /**
     * Clear location input (Symmetry view)
     */
    clearLocationInput() {
        this.elements.locationInput.value = '';
        this.elements.locationClearBtn.classList.add('hidden');
        this.cancelActiveLoad();
        this.hideLoading();
        this.currentLocation = null;
        this.hideLocationDropdown();
        localStorage.removeItem('solarSymmetry_location');
        this.renderSymmetryEmptyState();
        this.elements.locationInput.focus();
    }

    /**
     * Clear city input (Cities view)
     */
    clearCityInput(cityNumber) {
        if (cityNumber === 1) {
            this.elements.city1Input.value = '';
            this.elements.city1ClearBtn.classList.add('hidden');
            this.elements.city1Header.textContent = 'Select First City';
            this.city1 = null;
            this.hideCityDropdown(1);
            localStorage.removeItem('solarSymmetry_city1');
            this.elements.city1Input.focus();
        } else {
            this.elements.city2Input.value = '';
            this.elements.city2ClearBtn.classList.add('hidden');
            this.elements.city2Header.textContent = 'Select Second City';
            this.city2 = null;
            this.hideCityDropdown(2);
            localStorage.removeItem('solarSymmetry_city2');
            this.elements.city2Input.focus();
        }
        
        // Refresh the cities view if needed
        if (this.currentView === 'cities') {
            this.renderCitiesEmptyState();
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.solarApp = new SolarSymmetryApp();
});
