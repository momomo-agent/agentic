# Design: src/runtime/sense.js

## File
`src/runtime/sense.js`

## Purpose
Server-side sense runtime wrapper. On Node.js (no DOM), delegates to a stub or optional native binding. Exposes same interface as browser version.

## Interface

```js
// init(videoElement?) — no-op on server, accepts optional element for compat
export async function init(videoElement?: any): Promise<void>

// on(type, handler) — register event handler
export function on(type: 'face_detected'|'gesture_detected'|'object_detected', handler: (event: {type, data, ts}) => void): void

// start() — begin detection loop (no-op on server unless native pipeline available)
export function start(): void

// stop() — stop detection loop, clear pipeline
export function stop(): void

// detect(frame) — synchronous single-frame detection
export function detect(frame: any): { faces: Face[], gestures: Gesture[], objects: DetectedObject[] }

// listenForWakeWord(keyword, onDetected) — audio-based wake word detection
export function listenForWakeWord(keyword: string, onDetected: () => void): void

// stopWakeWord() — stop wake word listener
export function stopWakeWord(): void
```

## Logic

1. `init()`: Try `import('agentic-sense').createPipeline(...)`. If import fails (server env), set `pipeline = null` silently.
2. `detect(frame)`: If `pipeline == null`, return `{ faces: [], gestures: [], objects: [] }`.
3. `start()`: Only run `setInterval` if `pipeline != null`.
4. Wake word: use `process.stdin` or a stub — emit `wake_word` event via `on()` handlers.

## Edge Cases
- `agentic-sense` not available in Node: catch import error, degrade gracefully
- `detect()` called before `init()`: return empty result
- `start()` called twice: clear previous interval first

## Dependencies
- `agentic-sense` (optional peer dep)
- Node.js `events` (EventEmitter pattern via plain handlers map)

## Tests
- `detect(null)` returns `{ faces: [], gestures: [], objects: [] }` without throwing
- `on('face_detected', fn)` + `start()` + manual `emit` → handler called
- `stop()` clears interval and nulls pipeline
