# Design: sense.js补充detect()导出

## Status
`detect(frame)` is already exported in `src/runtime/sense.js` (lines 43-51).

## Verification
- File: `src/runtime/sense.js`
- Export: `export function detect(frame)` — present
- Returns: `{ faces, gestures, objects }` normalized from pipeline result
- Guard: returns empty arrays if `pipeline` is null

## Action Required
No code change needed. Task can be marked done after verifying the export exists.

## Test Cases
1. `detect(frame)` with initialized pipeline → returns `{ faces, gestures, objects }`
2. `detect(frame)` before `init()` → returns `{ faces: [], gestures: [], objects: [] }` without throwing
