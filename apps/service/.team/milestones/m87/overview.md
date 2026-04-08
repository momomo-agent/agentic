# M87: Test Edge Cases — sense.js, optimizer, CDN fallback, SIGINT

## Goal
Fix the 4 known failing test edge cases to push test pass rate above 90%.

## Scope
- Fix `createPipeline` export in `src/runtime/adapters/sense.js`
- Fix `optimizer.js` hardware-adaptive config output shape mismatch
- Fix CDN profiles fallback when fetch fails and no cache exists
- Fix SIGINT graceful drain during in-flight requests

## Acceptance Criteria
- All 4 edge cases pass
- Test pass rate >= 90%
- No regressions in existing passing tests
