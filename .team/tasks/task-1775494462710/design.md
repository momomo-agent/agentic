# Design: 感知运行时 sense.js

## File
`src/runtime/sense.js`

## Interface
```js
// sense.detect(frame) → { faces, gestures, objects }
// frame: ImageData | HTMLVideoElement | null
detect(frame)
```

## Logic
1. If `frame` is null/undefined → return `{ faces: [], gestures: [], objects: [] }`
2. Import `agentic-sense` and call its detect API for faces, gestures, objects
3. Return merged result object

## Error Handling
- Wrap in try/catch; on error return empty result (don't throw)

## Test Cases
- `detect(null)` → `{ faces: [], gestures: [], objects: [] }`
- `detect(frameWithFace)` → `faces.length >= 1`
- `detect(frameWithGesture)` → `gestures.length >= 1`
- `detect(frameWithObject)` → `objects.length >= 1`
