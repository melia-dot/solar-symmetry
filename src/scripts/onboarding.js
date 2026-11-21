/**
 * Onboarding: three welcome screens, shown once on first launch.
 *
 *   1. Welcome: what the app does + pick a city (search or "Use my location")
 *   2. Analytics: an optional Yes / No with equal weight. Nothing is pre-chosen;
 *      analytics stays off unless the user taps Yes (AppSettings.analytics).
 *   3. Companion: what the messages are, a preview, which moments to get.
 *      The phone's notification prompt only appears after "Turn on messages".
 *
 * Answers are saved on the device (src/utils/settings.js) and can all be
 * changed in Settings. Settings → tap the version 5 times → "Reset onboarding"
 * shows these screens again (for testing; never delete the app to re-test).
 */
class Onboarding {
    /**
     * @param {SolarSymmetryApp} app - for the saved city, sun times and selectLocation()
     * @param {Function} onDone - called after the last screen closes
     */
    constructor(app, onDone) {
        this.app = app;
        this.onDone = onDone;
        this.step = 1;
        this.location = app.currentLocation;
        this.moments = { ...AppSettings.get().moments };
        this.build();
        this.showStep(1);
    }

    static shouldShow() {
        return !AppSettings.get().onboardingDone;
    }

    build() {
        const root = document.createElement('div');
        root.id = 'onboarding';
        root.className = 'onboarding';
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-modal', 'true');
        root.setAttribute('aria-label', 'Welcome to Solar Symmetry');
        root.innerHTML = `
            <div class="ob-sky" aria-hidden="true"><div class="ob-sun"></div></div>
            <div class="ob-card">
                <ol class="ob-dots" aria-label="Step">
                    <li></li><li></li><li></li>
                </ol>

                <section class="ob-step" data-step="1" aria-labelledby="obTitle1">
                    <h1 id="obTitle1">Welcome to Solar Symmetry</h1>
                    <p class="ob-lead">See which day of the year has the same daylight as today, and watch the light come back.</p>
                    <h2 class="ob-question">Where are you?</h2>
                    <div class="ob-city"></div>
                    <div class="ob-actions">
                        <button type="button" class="primary-btn ob-next" disabled>Continue</button>
                    </div>
                </section>

                <section class="ob-step" data-step="2" aria-labelledby="obTitle2">
                    <div class="ob-icon" aria-hidden="true"><i data-lucide="bar-chart-3"></i></div>
                    <h1 id="obTitle2">Help improve Solar Symmetry?</h1>
                    <p class="ob-lead">Share anonymous usage stats, like which screens get used, so we can make the app better.</p>
                    <ul class="ob-points">
                        <li>No names, no exact location, no ads</li>
                        <li>Handled for us by Google Analytics for Firebase</li>
                        <li>Change your mind any time in Settings</li>
                    </ul>
                    <div class="ob-actions ob-choice">
                        <button type="button" class="choice-btn" data-analytics="no">No thanks</button>
                        <button type="button" class="choice-btn" data-analytics="yes">Yes, share stats</button>
                    </div>
                    <button type="button" class="link-btn ob-back">Back</button>
                </section>

                <section class="ob-step" data-step="3" aria-labelledby="obTitle3">
                    <h1 id="obTitle3">Meet your light companion</h1>
                    <p class="ob-lead">A friendly message timed with the sun: a nudge to catch the morning light, a heads-up before sunset, or a cosy note after dark.</p>
                    <figure class="ob-preview" aria-label="Example message">
                        <div class="ob-preview-head">
                            <img src="src/images/app-icon-96.png" alt="" class="ob-preview-icon">
                            <span>SolarSym</span><span class="ob-preview-time">now</span>
                        </div>
                        <p class="ob-preview-text"></p>
                    </figure>
                    <h2 class="ob-question">When would you like a message?</h2>
                    <div class="moment-list"></div>
                    <p class="moment-count"></p>
                    <div class="ob-actions">
                        <button type="button" class="primary-btn ob-notify">Turn on messages</button>
                        <button type="button" class="secondary-btn ob-skip">Not now</button>
                    </div>
                    <p class="ob-small">Your phone will then ask if SolarSym may send notifications.</p>
                    <button type="button" class="link-btn ob-back">Back</button>
                </section>
            </div>
        `;
        document.body.appendChild(root);
        document.body.classList.add('overlay-open');
        this.root = root;

        // Screen 1: city
        const next = root.querySelector('.ob-next');
        this.cityPicker = new CityPicker(root.querySelector('.ob-city'), {
            geocoding: this.app.geocoding,
            current: this.location,
            onPick: (location) => {
                this.location = location;
                next.disabled = false;
                // Load it in the app behind, so it's ready when onboarding ends
                this.app.selectLocation(location);
            },
        });
        next.disabled = !this.location;
        next.addEventListener('click', () => this.showStep(2));

        // Screen 2: analytics, equal weight, nothing pre-selected
        root.querySelectorAll('[data-analytics]').forEach((btn) => {
            btn.addEventListener('click', () => {
                AppSettings.setAnalytics(btn.dataset.analytics === 'yes');
                this.showStep(3);
            });
        });

        // Screen 3: companion
        renderMomentToggles(root.querySelector('.moment-list'), this.moments, (moment, on) => {
            this.moments[moment] = on;
            this.updateMomentCount();
        });
        root.querySelector('.ob-notify').addEventListener('click', () => this.turnOnMessages());
        root.querySelector('.ob-skip').addEventListener('click', () => this.finish(false));

        root.querySelectorAll('.ob-back').forEach((btn) => {
            btn.addEventListener('click', () => this.showStep(this.step - 1));
        });

        if (window.lucide) lucide.createIcons();
    }

    showStep(step) {
        this.step = step;
        this.root.querySelectorAll('.ob-step').forEach((section) => {
            section.classList.toggle('is-active', Number(section.dataset.step) === step);
        });
        this.root.querySelectorAll('.ob-dots li').forEach((dot, i) => {
            dot.classList.toggle('is-done', i < step);
            dot.toggleAttribute('aria-current', i === step - 1);
        });
        if (step === 3) {
            this.root.querySelector('.ob-preview-text').textContent = '…';
            companionPreview(this.app, this.location).then((text) => {
                this.root.querySelector('.ob-preview-text').textContent = text;
            });
            this.updateMomentCount();
        }
        this.root.scrollTop = 0;
    }

    updateMomentCount() {
        const n = AppSettings.MOMENTS.filter((m) => this.moments[m]).length;
        this.root.querySelector('.moment-count').textContent = momentCountText(n);
        this.root.querySelector('.ob-notify').disabled = n === 0;
    }

    async turnOnMessages() {
        const button = this.root.querySelector('.ob-notify');
        button.disabled = true;
        // Save first: onboarding is done and the ticked moments are kept, even
        // if the app is paused, reloaded or closed while the phone's prompt is up
        this.save(true);
        // The OS prompt appears now, straight after the user asked for messages
        const permission = await CompanionNotifications.request();
        // Don't Allow: no messages (they can turn them on later in Settings)
        this.finish(permission === 'granted' || permission === 'unavailable');
    }

    /** @param {boolean} messagesOn - keep the ticked moments, or none if false */
    save(messagesOn) {
        const moments = {};
        AppSettings.MOMENTS.forEach((m) => { moments[m] = messagesOn && !!this.moments[m]; });
        AppSettings.update({ onboardingDone: true, moments });
    }

    /** @param {boolean} messagesOn - keep the ticked moments, or none if false */
    finish(messagesOn) {
        if (this.finished) return;
        this.finished = true;
        this.save(messagesOn);

        this.root.classList.add('is-leaving');
        const remove = () => {
            this.root.remove();
            document.body.classList.remove('overlay-open');
            if (this.onDone) this.onDone();
        };
        this.root.addEventListener('animationend', remove, { once: true });
        setTimeout(() => { if (this.root.isConnected) remove(); }, 600);
    }
}

/* ----- Shared with Settings ----- */

const MOMENT_LABELS = {
    morning: { title: 'Morning', detail: 'Around sunrise' },
    beforeSunset: { title: 'Before sunset', detail: 'About 30 minutes before' },
    afterDark: { title: 'After dark', detail: 'In the evening' },
};

function momentCountText(n) {
    return n === 0 ? 'No messages' : n === 1 ? '1 message a day' : `${n} messages a day`;
}

/**
 * Three on/off switches (Morning / Before sunset / After dark).
 * onChange(moment, on) may return a Promise resolving to false to undo the change.
 */
function renderMomentToggles(container, moments, onChange) {
    container.innerHTML = '';
    AppSettings.MOMENTS.forEach((moment) => {
        const id = `moment-${moment}-${Math.random().toString(36).slice(2, 7)}`;
        const row = document.createElement('label');
        row.className = 'switch-row';
        row.htmlFor = id;
        row.innerHTML = `
            <span class="switch-text">
                <span class="switch-title">${MOMENT_LABELS[moment].title}</span>
                <span class="switch-detail">${MOMENT_LABELS[moment].detail}</span>
            </span>
            <input type="checkbox" role="switch" class="switch" id="${id}">
        `;
        const input = row.querySelector('input');
        input.checked = !!moments[moment];
        input.addEventListener('change', async () => {
            const keep = await onChange(moment, input.checked);
            if (keep === false) input.checked = !input.checked;
        });
        container.appendChild(row);
    });
}

/**
 * One morning line from the companion library, filled in with today's real
 * times for the chosen city (the same lines Phase 3 will send).
 */
let companionMessagesPromise = null;
async function companionPreview(app, location) {
    const fallback = 'Good morning. The light is on its way back, a little more each day.';
    if (!location) return fallback;
    try {
        companionMessagesPromise = companionMessagesPromise
            || fetch('src/data/companion-messages.json').then((r) => r.json());
        const library = await companionMessagesPromise;

        const today = new Date();
        const times = app.twilight.getCachedTwilight(today, location.lat, location.lng);

        // Days get shorter from the June to the December solstice (north);
        // the other way round in the southern hemisphere
        const md = (today.getMonth() + 1) * 100 + today.getDate();
        const northDarkening = md >= 621 && md < 1221;
        const season = (location.lat >= 0) === northDarkening ? 'darkening' : 'brightening';

        let daylight = '';
        if (times.sunriseISO && times.sunsetISO) {
            const minutes = Math.round((new Date(times.sunsetISO) - new Date(times.sunriseISO)) / 60000);
            daylight = `${Math.floor(minutes / 60)}h ${minutes % 60}m`; // as on the Today card
        }
        const values = {
            city: location.name.split(',')[0],
            sunrise: times.sunriseISO ? times.sunrise : '',
            sunset: times.sunsetISO ? times.sunset : '',
            daylight,
            mirrorDate: app.dateCalc.calculateMirrorDate(today)
                .toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }),
        };

        // Only lines we can fill in completely
        const lines = (library[season] && library[season].morning || []).filter((line) =>
            (line.match(/\{(\w+)\}/g) || []).every((p) => values[p.slice(1, -1)]));
        if (lines.length === 0) return fallback;
        const line = lines[Math.floor(Math.random() * lines.length)];
        return line.replace(/\{(\w+)\}/g, (_, key) => values[key]);
    } catch (error) {
        console.warn('[onboarding] preview failed:', error);
        return fallback;
    }
}

window.Onboarding = Onboarding;
