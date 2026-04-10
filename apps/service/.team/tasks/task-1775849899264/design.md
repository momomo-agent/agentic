# Design: Fix m28-profiles-cache.test.js — cache timestamp regression

## Module
Detector (ARCHITECTURE.md § Detector) — specifically `src/detector/profiles.js` cache write path.

## Root Cause
After a successful remote fetch, `profiles.js` was writing the refreshed profiles to cache but preserving the old `timestamp` value instead of setting `timestamp: Date.now()`.

## Fix
In `profiles.js`, after successful remote fetch, ensure the cache JSON includes `timestamp: Date.now()` before writing to disk.

## Files
- `src/detector/profiles.js` — cache write after remote fetch

## Verification
- `test/m28-profiles-cache.test.js` — "updates cache timestamp after successful fetch" passes

## Status
RESOLVED — fix applied in prior commit.
