/**
 * City picker: search for a city or "Use my location". Used by the welcome
 * screen (onboarding) and by Settings → City.
 *
 * Suggestions appear while typing, from the town list inside the app
 * (src/clients/town-search.js). The Search button / keyboard Search key asks
 * OpenStreetMap, for smaller places (it doesn't allow search-as-you-type; see
 * src/clients/geocoding.js). Location permission is asked only when the user
 * taps "Use my location".
 *
 *   const picker = new CityPicker(element, {
 *       geocoding,                 // a GeocodingClient
 *       current: savedLocation,    // shown as the chosen city, or null
 *       onPick: (location) => {}   // called when the user picks a city
 *   });
 */
class CityPicker {
    constructor(root, { geocoding, current = null, onPick }) {
        this.root = root;
        this.geocoding = geocoding;
        this.current = current;
        this.onPick = onPick;
        this.searchId = 0;
        this.render();
    }

    render() {
        this.root.classList.add('city-picker');
        this.root.innerHTML = `
            <div class="cp-chosen hidden">
                <i data-lucide="map-pin" aria-hidden="true"></i>
                <span class="cp-chosen-name"></span>
                <button type="button" class="cp-change link-btn">Change</button>
            </div>
            <div class="cp-search">
                <form class="cp-form" role="search">
                    <input type="text" class="cp-input" placeholder="Search for your city…"
                        autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="words" enterkeyhint="search"
                        aria-label="City">
                    <button type="submit" class="cp-search-btn">Search</button>
                </form>
                <div class="cp-results" role="list"></div>
                <p class="cp-status" role="status" aria-live="polite"></p>
                <button type="button" class="cp-locate secondary-btn">
                    <i data-lucide="locate-fixed" aria-hidden="true"></i>
                    <span>Use my location</span>
                </button>
            </div>
        `;

        this.el = {
            chosen: this.root.querySelector('.cp-chosen'),
            chosenName: this.root.querySelector('.cp-chosen-name'),
            change: this.root.querySelector('.cp-change'),
            search: this.root.querySelector('.cp-search'),
            form: this.root.querySelector('.cp-form'),
            input: this.root.querySelector('.cp-input'),
            results: this.root.querySelector('.cp-results'),
            status: this.root.querySelector('.cp-status'),
            locate: this.root.querySelector('.cp-locate'),
        };

        this.el.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.search();
        });
        this.el.input.addEventListener('input', () => {
            // Old results no longer match what's typed: suggest from the town list
            this.searchId++;
            this.setStatus('');
            this.suggest(this.el.input.value);
        });
        this.el.locate.addEventListener('click', () => this.useMyLocation());
        this.el.change.addEventListener('click', () => {
            this.showSearch();
            this.el.input.focus();
        });

        if (this.current) this.showChosen(this.current); else this.showSearch();
        if (window.lucide) lucide.createIcons();
    }

    showChosen(location) {
        this.el.chosenName.textContent = location.name;
        this.el.chosen.classList.remove('hidden');
        this.el.search.classList.add('hidden');
    }

    showSearch() {
        this.el.chosen.classList.add('hidden');
        this.el.search.classList.remove('hidden');
        this.el.results.innerHTML = '';
        this.setStatus('');
    }

    setStatus(text, isError = false) {
        this.el.status.textContent = text;
        this.el.status.classList.toggle('is-error', isError);
    }

    setBusy(busy) {
        this.el.locate.disabled = busy;
        this.root.querySelector('.cp-search-btn').disabled = busy;
    }

    async search() {
        const query = this.el.input.value.trim();
        if (query.length < 2) {
            this.setStatus('Type at least 2 letters of your city.');
            return;
        }
        this.el.input.blur(); // hide the keyboard so the results are visible
        const id = ++this.searchId;
        this.setBusy(true);
        this.setStatus('Searching…');
        const results = await this.geocoding.searchLocations(query);
        this.setBusy(false);
        if (id !== this.searchId) return; // a newer search has started

        if (results.length === 0) {
            this.el.results.innerHTML = '';
            this.setStatus('No places found. Check the spelling, try a bigger town nearby, or check your internet connection.', true);
            return;
        }
        this.setStatus('');
        this.showResults(results, GeocodingClient);
    }

    /** Town-list suggestions for what's typed (instant, no internet needed) */
    async suggest(query) {
        const id = this.searchId;
        const towns = query.trim().length >= 2
            ? await TownSearch.shared.search(query).catch(() => [])
            : [];
        if (id !== this.searchId) return; // typed on, or a search started
        if (towns.length === 0) {
            this.el.results.innerHTML = '';
            if (query.trim().length >= 2) this.setStatus('Not in the list? Press Search to look further.');
            return;
        }
        this.setStatus('');
        this.showResults(towns, TownSearch);
    }

    /** One button per place, then the credit for where the list came from */
    showResults(locations, source) {
        this.el.results.innerHTML = '';
        locations.forEach((location) => {
            const row = document.createElement('button');
            row.type = 'button';
            row.className = 'cp-result';
            row.setAttribute('role', 'listitem');
            row.textContent = location.name;
            row.addEventListener('click', () => this.pick(location));
            this.el.results.appendChild(row);
        });
        const credit = document.createElement('a');
        credit.className = 'search-credit';
        credit.href = source.ATTRIBUTION_URL;
        credit.textContent = source.ATTRIBUTION;
        credit.addEventListener('click', (e) => {
            e.preventDefault();
            openExternalLink(source.ATTRIBUTION_URL);
        });
        this.el.results.appendChild(credit);
    }

    async useMyLocation() {
        const id = ++this.searchId;
        this.setBusy(true);
        this.el.results.innerHTML = '';
        this.setStatus('Finding your location…');
        try {
            const location = await this.geocoding.getCurrentLocation();
            if (id !== this.searchId) return;
            this.pick(location);
        } catch (error) {
            if (id !== this.searchId) return;
            console.warn('[city-picker] location failed:', error.reason, error.cause || error);
            this.setStatus(GeocodingClient.locationErrorText(error), true);
        } finally {
            this.setBusy(false);
        }
    }

    pick(location) {
        this.current = location;
        this.el.input.value = '';
        this.showChosen(location);
        this.onPick(location);
    }
}

window.CityPicker = CityPicker;
