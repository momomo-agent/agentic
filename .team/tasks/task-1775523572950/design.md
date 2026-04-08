# sense.js Headless Camera Path — Technical Design

## Files to Modify
- `src/runtime/sense.js` — add headless (non-browser) camera input path

## Function Signatures
```js
// Add to src/runtime/sense.js
export function startHeadless(options?: { deviceIndex?: number }): EventEmitter
// Returns emitter emitting: 'face_detected', 'gesture_detected', 'object_detected', 'wakeword'
```

## Algorithm
1. Check if `startHeadless` already exists (it does — hub.js calls it). Read full sense.js to find current implementation.
2. If stub/missing: use `node-canvas` + `@mediapipe/tasks-vision` or fall back to a polling loop that emits `wakeword` on a keyword match from STT.
3. Headless path: spawn a child process or use `canvas.createImageData` to feed frames into `pipeline.detect(frame)`.
4. Emit events via returned `EventEmitter` matching existing browser-side event names.

## Current State (from file)
`sense.js` has `startHeadless` partially — check bottom of file for `_wakeActive` flag and complete the implementation if the function body is missing.

## Edge Cases
- No camera device on server → emit only `wakeword` events via STT path, skip visual detection
- `agentic-sense` not available server-side → catch import error, return emitter that only fires `wakeword`

## Dependencies
- `agentic-sense` (optional peer dep for server)
- `node:events` EventEmitter

## Test Cases
- `startHeadless()` returns EventEmitter without throwing
- On server with no camera, emitter still functional (no crash)
