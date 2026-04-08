# Design: src/runtime/sense.js — MediaPipe headless

## Status
File already exists at `src/runtime/sense.js` with full headless implementation.

## Existing Interface (matches architecture)

```javascript
// Headless init — no videoElement required
initHeadless(options?: { face: boolean, gesture: boolean, object: boolean }): Promise<void>

// Process a raw frame buffer
detectFrame(buffer: Buffer | null): { faces: Array<{boundingBox}>, gestures: Array<{gesture}>, objects: Array<{label, confidence}> }

// Start headless event emitter (wakeword events)
startHeadless(): EventEmitter

// Browser path (not used server-side)
init(videoElement): Promise<void>
start(): void
stop(): void
on(type: string, handler: Function): void
```

## Key Logic
- `initHeadless` calls `createPipeline(options)` from `agentic-sense` without a videoElement
- `detectFrame(buffer)` delegates to `detect(buffer)` — returns empty arrays if pipeline not initialized or buffer is null
- `startHeadless()` wires wake word pipeline to an EventEmitter and returns it

## Edge Cases
- `detectFrame(null)` → returns `{ faces: [], gestures: [], objects: [] }`
- `startHeadless()` called before `initHeadless` → pipeline is null, detectFrame returns empty
- Wake word stub logs warning when no mic available

## Test Cases
- `detectFrame(null)` returns empty result without throwing
- `startHeadless()` returns an EventEmitter
- `initHeadless()` resolves without videoElement
