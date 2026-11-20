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
