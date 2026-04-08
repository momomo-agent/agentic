# Design: src/runtime/sense.js

## File
`src/runtime/sense.js` — already exists, verify completeness

## Current Implementation
- `init(videoElement)` — creates MediaPipe pipeline (face/gesture/object)
- `start()` / `stop()` — interval-based detection loop (100ms)
- `on(type, handler)` / `emit(type, data)` — event system
- `detect(frame)` — single-frame detection
- `startWakeWordPipeline(onWake)` — server-side stub (no mic)
- `initHeadless(options)` / `startHeadless()` — server-side headless mode
- `detectFrame(buffer)` — null-safe frame detection

## Interface
```js
export async function init(videoElement?: HTMLVideoElement): Promise<void>
export function on(type: string, handler: Function): void
export function start(): void
export function stop(): void
export function detect(frame: any): { faces, gestures, objects }
export function startWakeWordPipeline(onWake: () => void): () => void
export async function initHeadless(options?: object): Promise<void>
export function startHeadless(): EventEmitter
export function detectFrame(buffer: any): { faces, gestures, objects }
```

## Logic
- Browser: `init(video)` → `start()` → interval calls `pipeline.detect(video)` → emits typed events
- Server: `initHeadless()` → `detectFrame(buf)` for per-frame analysis
- Wake word: stub returns no-op stop fn, logs warning

## Edge Cases
- `start()` called twice → clears previous interval first
- `detect(frame)` with no pipeline → returns empty arrays
- `detectFrame(null)` → returns empty arrays
- `startWakeWordPipeline` called twice → returns no-op on second call

## Dependencies
- `agentic-sense` → `createPipeline`
- `node:events` → `EventEmitter`

## Tests
- `detect(frame)` without `init()` → returns `{ faces:[], gestures:[], objects:[] }`
- `detectFrame(null)` → returns empty result
- `startWakeWordPipeline` called twice → `_wakeActive` guard prevents double start
- `startHeadless()` returns EventEmitter
