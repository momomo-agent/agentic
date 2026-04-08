# Test Result: sense.js detect(frame) API 修复

## Status: PASSED

## Tests Run
File: `test/runtime/sense-detect-m10.test.js`

| # | Test | Result |
|---|------|--------|
| 1 | DBB-001: returns empty arrays before init() | ✅ PASS |
| 2 | DBB-001: does not throw before init() | ✅ PASS |
| 3 | DBB-002: maps faces after init() | ✅ PASS |
| 4 | DBB-003: maps gestures after init() | ✅ PASS |
| 5 | DBB-004: filters objects below 0.5 confidence | ✅ PASS |
| 6 | DBB-001: handles undefined faces/gestures/objects from pipeline | ✅ PASS |
| 7 | DBB-001: on() event interface still works after detect() added | ✅ PASS |

**Total: 7/7 passed**

## DBB Verification
- DBB-001: `detect(frame)` returns `{faces,gestures,objects}` ✅
- DBB-001: Sync call does not throw ✅
- DBB-001: Existing `on()` event interface intact ✅
- Objects filtered at confidence > 0.5 ✅

## Edge Cases Verified
- `pipeline` null before `init()` → empty arrays, no throw
- `result.faces/gestures/objects` undefined → defaults to `[]`
- Extra fields stripped from mapped output
