# sense.js detect(frame) API 修复

## Progress

Added `detect(frame)` export to `src/runtime/sense.js`. Returns `{faces, gestures, objects}` normalized. Returns empty arrays when pipeline is null. Existing event interface unchanged.

