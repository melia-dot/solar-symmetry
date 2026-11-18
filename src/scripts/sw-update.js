/**
 * Service worker registration + automatic updates
 *
 * - Checks for a new version when the app opens and when it comes back to the foreground.
 * - When a new version has downloaded, waits for data loading to finish (or cancels it
 *   after 15s), activates the new version and reloads the page once.
 * - Reload-loop protection:
 *     • no reload when the service worker is installed for the first time
 *     • at most one reload per page
 *     • no second automatic reload within 60s (sessionStorage); a further update
 *       then waits until the next time the app is opened or brought to the foreground
 */
(function () {
    if (!('serviceWorker' in navigator)) return;

    const RELOAD_GUARD_KEY = 'solarSymmetry_swReloadedAt';
    const RELOAD_GUARD_MS = 60 * 1000;
    const MAX_WAIT_FOR_LOAD_MS = 15 * 1000;
    const MIN_CHECK_INTERVAL_MS = 10 * 1000;

    let registration = null;
    let lastCheck = 0;
    let activating = false;
    let reloading = false;
    // No controller at start = first install. When that worker takes control, don't reload.
    let hadController = !!navigator.serviceWorker.controller;

    const log = (message) => console.info(`[sw-update] ${message}`);

    function reloadedRecently() {
        try {
            const at = Number(sessionStorage.getItem(RELOAD_GUARD_KEY));
            return at > 0 && Date.now() - at < RELOAD_GUARD_MS;
        } catch (error) {
            return false;
        }
    }

    function markReload() {
        try {
            sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
        } catch (error) {
            // Storage unavailable: the per-page `reloading` flag still prevents repeats
        }
    }

    /**
     * Wait until the app has finished loading data; cancel the load if it takes too long
     */
    async function waitForIdle() {
        const app = window.solarApp;
        if (!app || typeof app.whenIdle !== 'function') return;

        let timer;
        const timedOut = new Promise((resolve) => {
            timer = setTimeout(() => resolve(true), MAX_WAIT_FOR_LOAD_MS);
        });
        const idle = app.whenIdle().then(() => false);

        if (await Promise.race([idle, timedOut])) {
            log('data still loading after 15s, cancelling it before updating');
            app.cancelActiveLoad();
        }
        clearTimeout(timer);
    }

    async function activate(worker) {
        if (activating || reloading) return;

        if (reloadedRecently()) {
            log('new version ready, but the page already reloaded for an update in the last 60s; it will be applied next time the app is opened');
            return;
        }

        activating = true;
        worker.addEventListener('statechange', () => {
            // Replaced by an even newer version before it activated: allow that one through
            if (worker.state === 'redundant') activating = false;
        });
        log('new version downloaded, waiting for data loading to finish');
        await waitForIdle();
        log('activating new version');
        worker.postMessage({ type: 'SKIP_WAITING' });
    }

    function activateIfWaiting() {
        if (registration && registration.waiting && navigator.serviceWorker.controller) {
            activate(registration.waiting);
        }
    }

    function watch(reg) {
        reg.addEventListener('updatefound', () => {
            const worker = reg.installing;
            if (!worker) return;

            worker.addEventListener('statechange', () => {
                // "installed" with an existing controller = an update (not a first install)
                if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                    activate(worker);
                }
            });
        });
    }

    function checkForUpdate() {
        if (!registration) return;

        activateIfWaiting();

        if (Date.now() - lastCheck < MIN_CHECK_INTERVAL_MS) return;
        lastCheck = Date.now();

        registration.update().catch((error) => {
            // Offline or server unreachable: try again next time
            log(`update check failed: ${error.message}`);
        });
    }

    navigator.serviceWorker.addEventListener('controllerchange', async () => {
        if (!hadController) {
            hadController = true;
            return;
        }
        if (reloading) return;
        reloading = true;

        // Another tab may have triggered the switch: still finish loading first
        await waitForIdle();
        markReload();
        log('new version active, reloading');
        window.location.reload();
    });

    window.addEventListener('load', async () => {
        try {
            registration = await navigator.serviceWorker.register('service-worker.js', {
                updateViaCache: 'none' // always fetch service-worker.js and version.js fresh
            });
            watch(registration);
            checkForUpdate();
        } catch (error) {
            console.warn('[sw-update] service worker registration failed:', error);
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkForUpdate();
        }
    });
})();
