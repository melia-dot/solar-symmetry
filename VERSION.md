# Version Management

## Current Version: 1.0.3

## Versioning Rules

Solar Symmetry uses **Semantic Versioning** (MAJOR.MINOR.PATCH):

### Format: `MAJOR.MINOR.PATCH`

- **PATCH** (e.g., 1.0.0 → 1.0.1): Bug fixes, minor tweaks, no new features
- **MINOR** (e.g., 1.0.1 → 1.1.0): New features, enhancements, backward-compatible changes
- **MAJOR** (e.g., 1.1.0 → 2.0.0): Breaking changes, major redesigns, API changes

## How to Update the Version

**IMPORTANT:** Update the version number in **THREE places** before every push to GitHub:

1. **`src/version.js`** - Update the `APP_VERSION` constant
2. **`manifest.json`** - Update the `version` field
3. **`VERSION.md`** - Update the "Current Version" at the top of this file

### Example: Bug Fix (1.0.1 → 1.0.2)

```javascript
// src/version.js
const APP_VERSION = '1.0.2';
```

```json
// manifest.json
{
  "version": "1.0.2",
  ...
}
```

```markdown
// VERSION.md
## Current Version: 1.0.2
```

## Version History

### 1.0.3 (2025-11-01)
- Removed location pin icons (📍) from all city input fields to save space
- Adjusted dropdown positioning after removing pins

### 1.0.2 (2025-11-01)
- Fixed cities compare column alignment (both city headers now same height)
- Removed "VS" divider to save vertical space in header

### 1.0.1 (2025-11-01)
- Fixed cities compare view not displaying data (missing animations)
- Added version number display in UI

### 1.0.0 (Initial Release)
- Solar symmetry view (mirror dates around solstices)
- Cities comparison view
- Golden hour toggle for photographers
- Light after work countdown timer
- PWA support with offline functionality
- Location search with localStorage persistence

## Best Practices

1. **Always update all three files** before pushing to GitHub
2. **Commit version changes separately** from feature/fix commits when possible
3. **Test the PWA** after version updates to ensure cache invalidation works
4. **Version number appears** in the UI next to the location pin icon
5. **Users can see the version** to confirm they have the latest update after clearing PWA cache

## Why This Matters for PWAs

PWAs cache aggressively. The version number helps:
- Users confirm they have the latest version
- Developers track which version is deployed
- Debugging issues by knowing exact version in production
- Service worker updates can be tied to version changes
