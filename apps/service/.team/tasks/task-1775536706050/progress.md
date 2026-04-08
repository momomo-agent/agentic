# Verify CDN profiles.json fallback to default.json

## Progress

- `loadBuiltinProfiles()` reads `profiles/default.json` via `import.meta.url` ✓
- `profiles/default.json` has cpu-only catch-all entries ✓
- Created `test/profiles-fallback.test.js` — 2 tests passing
