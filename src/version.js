/**
 * Application Version: the ONLY place the version is defined.
 *
 * - The UI shows it (app.js reads APP_VERSION).
 * - The service worker names its cache after it, so bumping it pushes new code
 *   to installed PWAs.
 *
 * VERSIONING RULES (see CLAUDE.md / VERSION.md):
 * - PATCH for fixes (1.4.2 → 1.4.3)
 * - MINOR for new features (1.4.2 → 1.5.0)
 * - MAJOR for breaking changes / major redesigns (1.4.2 → 2.0.0)
 */

const APP_VERSION = '1.4.0';

// `self` is `window` on the page and the worker scope in the service worker
self.APP_VERSION = APP_VERSION;
