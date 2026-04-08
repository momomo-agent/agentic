# Test Result: sense.js补充detect()导出

## Status: PASS

## Tests Run
- test/m17-sense-detect.test.js

## Results
- PASS: detect() before init returns empty arrays without throwing
- PASS: detect() with pipeline returns { faces, gestures, objects }
- PASS: detect() is exported from src/runtime/sense.js

## Total: 3/3 passed

## Notes
`export function detect(frame)` already present at line 43 of src/runtime/sense.js. No code change needed.
