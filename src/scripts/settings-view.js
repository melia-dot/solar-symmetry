/**
 * Settings screen, opened from the gear icon in the header.
 *
 * City, companion messages (Morning / Before sunset / After dark: each ticked
 * moment is one message a day), analytics on/off, privacy policy, terms,
 * OpenStreetMap credit and the app version.
 *
 * Hidden testing option: tap the version 5 times to show "Reset onboarding".
 * "Restore purchase" is added in Phase 5, when there's something to restore.
 */

// Public Notion pages (Mikael publishes them, then the links go here).
// While empty, the rows say "Coming soon".
const LEGAL_LINKS = {
    privacy: '',
    terms: '',
};

class SettingsView {
    constructor(app) {
        this.app = app;
        this.versionTaps = 0;
    }

    open() {
        if (this.root) return;
        const settings = AppSettings.get();

        const root = document.createElement('div');
        root.id = 'settingsPanel';
        root.className = 'sheet';
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-modal', 'true');
        root.setAttribute('aria-labelledby', 'settingsTitle');
        root.innerHTML = `
            <header class="sheet-header">
                <h1 id="settingsTitle">Settings</h1>
                <button type="button" class="sheet-done">Done</button>
            </header>
            <div class="sheet-body">
                <section class="settings-group">
                    <h2>Your city</h2>
                    <div class="settings-card settings-city"></div>
                </section>

                <section class="settings-group">
                    <h2>Companion messages</h2>
                    <div class="settings-card">
                        <div class="moment-list"></div>
                    </div>
                    <p class="settings-note moment-count"></p>
                    <p class="settings-note is-warning notify-blocked hidden"></p>
                </section>

                <section class="settings-group">
                    <h2>Privacy</h2>
                    <div class="settings-card">
                        <label class="switch-row" for="analyticsSwitch">
                            <span class="switch-text">
                                <span class="switch-title">Share anonymous usage stats</span>
                                <span class="switch-detail">Helps improve the app</span>
                            </span>
                            <input type="checkbox" role="switch" class="switch" id="analyticsSwitch">
                        </label>
                    </div>
                    <p class="settings-note">Off unless you turn it on. Stats are handled for us by Google Analytics for Firebase: no names, no exact location, no ads.</p>
                </section>

                <section class="settings-group">
                    <h2>About</h2>
                    <div class="settings-card">
                        <button type="button" class="settings-row" data-link="privacy">
                            <span>Privacy policy</span><span class="row-end"></span>
                        </button>
                        <button type="button" class="settings-row" data-link="terms">
                            <span>Terms of use</span><span class="row-end"></span>
                        </button>
                        <button type="button" class="settings-row" data-link="osm">
                            <span>${GeocodingClient.ATTRIBUTION}</span><span class="row-end"><i data-lucide="chevron-right"></i></span>
                        </button>
                        <button type="button" class="settings-row settings-version">
                            <span>Version</span><span class="row-end">${window.APP_VERSION || ''}</span>
                        </button>
                        <button type="button" class="settings-row settings-reset hidden">
                            <span>Reset onboarding</span><span class="row-end">Testing</span>
                        </button>
                    </div>
                </section>
            </div>
        `;
        document.body.appendChild(root);
        document.body.classList.add('overlay-open');
        this.root = root;

        root.querySelector('.sheet-done').addEventListener('click', () => this.close());

        // City
        new CityPicker(root.querySelector('.settings-city'), {
            geocoding: this.app.geocoding,
            current: this.app.currentLocation,
            onPick: (location) => this.app.selectLocation(location),
        });

        // Companion moments: turning one on asks for notification permission
        // first (the user has just asked for messages, so the prompt isn't cold)
        renderMomentToggles(root.querySelector('.moment-list'), settings.moments, async (moment, on) => {
            if (on) {
                let permission = await CompanionNotifications.status();
                if (permission === 'prompt') permission = await CompanionNotifications.request();
                if (permission === 'denied') {
                    this.showBlocked(true);
                    return false;
                }
            }
            AppSettings.setMoment(moment, on);
            this.updateMomentCount();
            return true;
        });
        this.updateMomentCount();
        this.checkBlocked();

        // Analytics: explicit on/off, saved with the time it was changed
        const analytics = root.querySelector('#analyticsSwitch');
        analytics.checked = settings.analytics === true;
        analytics.addEventListener('change', () => AppSettings.setAnalytics(analytics.checked));

        // Links
        root.querySelectorAll('[data-link]').forEach((row) => {
            const key = row.dataset.link;
            const url = key === 'osm' ? GeocodingClient.ATTRIBUTION_URL : LEGAL_LINKS[key];
            if (key !== 'osm') {
                row.querySelector('.row-end').innerHTML = url ? '<i data-lucide="chevron-right"></i>' : 'Coming soon';
                row.disabled = !url;
            }
            row.addEventListener('click', () => { if (url) openExternalLink(url); });
        });

        // Hidden: 5 taps on the version shows "Reset onboarding"
        root.querySelector('.settings-version').addEventListener('click', () => {
            this.versionTaps += 1;
            if (this.versionTaps >= 5) root.querySelector('.settings-reset').classList.remove('hidden');
        });
        root.querySelector('.settings-reset').addEventListener('click', () => this.resetOnboarding());

        if (window.lucide) lucide.createIcons();
        requestAnimationFrame(() => root.classList.add('is-open'));
    }

    close() {
        if (!this.root) return;
        const root = this.root;
        this.root = null;
        this.versionTaps = 0;
        root.classList.remove('is-open');
        const remove = () => {
            root.remove();
            if (!document.querySelector('.onboarding, .sheet')) {
                document.body.classList.remove('overlay-open');
            }
        };
        root.addEventListener('transitionend', remove, { once: true });
        setTimeout(() => { if (root.isConnected) remove(); }, 500);
    }

    updateMomentCount() {
        this.root.querySelector('.moment-count').textContent =
            `${momentCountText(AppSettings.messagesPerDay())}. Each one you turn on is one message a day, timed with the sun.`;
    }

    async checkBlocked() {
        const permission = await CompanionNotifications.status();
        this.showBlocked(permission === 'denied' && AppSettings.messagesPerDay() > 0);
    }

    showBlocked(show) {
        if (!this.root) return;
        const note = this.root.querySelector('.notify-blocked');
        note.textContent = CompanionNotifications.blockedText;
        note.classList.toggle('hidden', !show);
    }

    resetOnboarding() {
        if (!window.confirm('Show the welcome screens again? Your city is kept.')) return;
        AppSettings.resetOnboarding();
        this.close();
        new Onboarding(this.app);
    }
}

window.SettingsView = SettingsView;
