# Design: sense.js服务端无头模式

## File to modify
`src/runtime/sense.js`

## New exports

```js
// Initialize pipeline without videoElement (server/Node.js path)
export async function initHeadless(options = { face: true, gesture: true, object: true })
  // impl: pipeline = await createPipeline(options)
  // does NOT set pipeline._video

// Process a raw frame buffer (server-side)
export function detectFrame(buffer: Buffer): SenseResult
  // impl: same as existing detect(frame) — calls pipeline.detect(buffer)
  // returns { faces, gestures, objects }
```

## No changes to existing API
`init(videoElement)`, `start()`, `stop()`, `on()`, `detect(frame)` remain unchanged.

## Edge cases
- `detectFrame` called before `initHeadless` → return `{ faces: [], gestures: [], objects: [] }` (same guard as `detect`)
- `buffer` is null/undefined → same empty result, no throw

## Dependencies
- `agentic-sense` `createPipeline` (already imported)
- No new deps

## Test cases
1. `initHeadless()` → pipeline created, no DOM access
2. `detectFrame(buffer)` → returns SenseResult shape
3. `detectFrame` before init → returns empty result
4. Browser path (`init` + `start`) still works after adding headless exports
