/**
 * Platform check: web (browser / installed PWA) or the native iOS/Android app.
 *
 * The native app wraps these same files with Capacitor, which injects
 * window.Capacitor before any page script runs. On the web it doesn't exist.
 * Use isNativeApp() to put native-only behaviour behind a check, so the web
 * version keeps working unchanged.
 */
function isNativeApp() {
    return !!(window.Capacitor
        && typeof window.Capacitor.isNativePlatform === 'function'
        && window.Capacitor.isNativePlatform());
}

/**
 * Native app only: Capacitor's core script, which adds Capacitor.registerPlugin
 * (needed to call plugins without a build step). scripts/build-www.mjs copies it
 * from node_modules into www/, so it always matches the installed Capacitor;
 * the website never loads it. Starts loading straight away.
 */
const capacitorCoreReady = isNativeApp()
    ? new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'src/vendor/capacitor-core.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('capacitor-core.js failed to load'));
        document.head.appendChild(script);
    })
    : null;

/**
 * Call once the first screen has been drawn. In the native app this fades out
 * the launch screen, so the launch artwork flows straight into the app with no
 * blank flash in between. (The launch screen also hides by itself after 3s,
 * see capacitor.config.json, in case anything here fails.)
 */
function onAppReady() {
    if (!capacitorCoreReady) return;

    // Two frames: the browser has actually painted the first screen
    requestAnimationFrame(() => requestAnimationFrame(() => {
        capacitorCoreReady
            .then(() => window.Capacitor.registerPlugin('SplashScreen').hide({ fadeOutDuration: 300 }))
            .catch((error) => console.warn('[platform] could not hide the launch screen:', error));
    }));
}

/**
 * Native app only: a Capacitor plugin by its registered name ('Geolocation',
 * 'LocalNotifications', 'Browser', ...), or null on the web. No build step:
 * registerPlugin gives a proxy that talks to the plugin's native code.
 * @returns {Promise<Object|null>}
 */
const nativePlugins = new Map();
async function nativePlugin(name) {
    if (!capacitorCoreReady) return null;
    await capacitorCoreReady;
    if (!nativePlugins.has(name)) {
        nativePlugins.set(name, window.Capacitor.registerPlugin(name));
    }
    return nativePlugins.get(name);
}

/**
 * Open a web page (privacy policy, terms, OpenStreetMap credit). In the app it
 * opens in an in-app browser sheet (Capacitor Browser: SFSafariViewController
 * on iOS, Custom Tabs on Android), so the user stays in SolarSym.
 */
async function openExternalLink(url) {
    try {
        const Browser = await nativePlugin('Browser');
        if (Browser) {
            await Browser.open({ url, presentationStyle: 'popover' });
            return;
        }
    } catch (error) {
        console.warn('[platform] in-app browser failed, opening normally:', error);
    }
    window.open(url, '_blank', 'noopener');
}
