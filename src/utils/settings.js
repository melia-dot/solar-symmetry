/**
 * The user's choices from onboarding and the Settings screen, saved on the
 * device (localStorage, next to the saved city). Nothing here leaves the phone.
 *
 * - onboardingDone: the 3 welcome screens have been completed
 * - analytics: true (said Yes), false (said No) or null (never asked).
 *   Analytics only ever runs when this is exactly true (Phase 4 reads it via
 *   AppSettings.analyticsAllowed()). analyticsAnsweredAt records when, so we
 *   can ask again later if needed.
 * - moments: which companion messages the user wants. Each ticked moment is
 *   one message a day (Phase 3 schedules them). Default: Morning only.
 */
const AppSettings = (() => {
    const KEY = 'solarSymmetry_settings';
    const MOMENTS = ['morning', 'beforeSunset', 'afterDark'];

    const defaults = () => ({
        onboardingDone: false,
        analytics: null,
        analyticsAnsweredAt: null,
        moments: { morning: true, beforeSunset: false, afterDark: false },
    });

    function read() {
        try {
            const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
            const d = defaults();
            return { ...d, ...saved, moments: { ...d.moments, ...(saved.moments || {}) } };
        } catch (error) {
            console.warn('[settings] could not read saved settings:', error);
            return defaults();
        }
    }

    function write(settings) {
        try {
            localStorage.setItem(KEY, JSON.stringify(settings));
        } catch (error) {
            console.error('[settings] could not save settings:', error);
        }
    }

    return {
        MOMENTS,
        get: read,

        update(changes) {
            const next = { ...read(), ...changes };
            write(next);
            return next;
        },

        setMoment(moment, on) {
            const s = read();
            s.moments = { ...s.moments, [moment]: !!on };
            write(s);
            return s;
        },

        setAnalytics(yes) {
            return this.update({ analytics: !!yes, analyticsAnsweredAt: new Date().toISOString() });
        },

        /** True only after an explicit Yes. Never assume consent. */
        analyticsAllowed() {
            return read().analytics === true;
        },

        /** Messages per day = number of ticked moments */
        messagesPerDay() {
            const m = read().moments;
            return MOMENTS.filter(k => m[k]).length;
        },

        /** Testing: forget the onboarding answers (the saved city is kept) */
        resetOnboarding() {
            write(defaults());
        },
    };
})();

window.AppSettings = AppSettings;

/**
 * Permission to show companion notifications (Capacitor LocalNotifications).
 * The OS prompt is only ever triggered by request(), which is only called
 * right after the user taps a button that says messages will be turned on.
 * Returns 'granted', 'denied', 'prompt' or 'unavailable' (website: no plugin).
 */
const CompanionNotifications = {
    async status() {
        try {
            const plugin = await nativePlugin('LocalNotifications');
            if (!plugin) return 'unavailable';
            const { display } = await plugin.checkPermissions();
            return display === 'granted' || display === 'denied' ? display : 'prompt';
        } catch (error) {
            console.warn('[notifications] permission check failed:', error);
            return 'unavailable';
        }
    },

    async request() {
        try {
            const plugin = await nativePlugin('LocalNotifications');
            if (!plugin) return 'unavailable';
            const { display } = await plugin.requestPermissions();
            return display === 'granted' ? 'granted' : 'denied';
        } catch (error) {
            console.warn('[notifications] permission request failed:', error);
            return 'denied';
        }
    },

    /** Plain-words help when notifications are blocked in the phone's settings */
    blockedText: 'Notifications are turned off for SolarSym. To get messages, open your phone’s Settings app, find SolarSym and turn on Notifications.',
};

window.CompanionNotifications = CompanionNotifications;
