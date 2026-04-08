# Milestone 8: Build Fix & Production Readiness

## Goal
Fix critical build-breaking bug in the auto backend selection feature and ensure the package can be built and published.

## Scope
- Fix AgenticStoreBackend instantiation in createBackend() function
- Verify TypeScript build succeeds
- Ensure all tests still pass after the fix

## Context
The createBackend() auto-selection feature added in m7 has a critical bug: it calls `new AgenticStoreBackend()` without the required `store` parameter, breaking the TypeScript build. This must be fixed before the package can be published.

## Acceptance Criteria
- TypeScript build completes without errors
- All 330 tests continue to pass
- createBackend() correctly instantiates AgenticStoreBackend with a valid IndexedDB store
- Auto backend selection works in browser environments

## Related Gaps
- Vision gap: "No automatic backend selection based on runtime environment" - partially implemented but broken
