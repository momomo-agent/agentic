# Fix m21-profiles.test.js — matchProfile throws No matching profile found

## Progress

### Verification (2026-04-11)

Ran `npx vitest run test/m21-profiles.test.js` — 2/2 tests pass.

The design doc confirms this was already fixed. The matcher.js and profiles.js logic correctly handles the test hardware fixtures. No code changes needed.

## Result

Task complete — tests already passing.
