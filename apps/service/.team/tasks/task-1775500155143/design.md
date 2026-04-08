# Design: sense.js detect(frame) API 修复

## File
`src/runtime/sense.js`

## Change
Add a named export `detect(frame)` that calls `pipeline.detect()` synchronously and returns normalized result.

## Function Signature
```js
export function detect(frame: HTMLVideoElement | ImageData): {
  faces: Array<{ boundingBox: object }>,
  gestures: Array<{ gesture: string }>,
  objects: Array<{ label: string, confidence: number }>
}
```

## Logic
```js
export function detect(frame) {
  if (!pipeline) return { faces: [], gestures: [], objects: [] }
  const result = pipeline.detect(frame)
  return {
    faces: (result.faces || []).map(f => ({ boundingBox: f.boundingBox })),
    gestures: (result.gestures || []).map(g => ({ gesture: g.gesture })),
    objects: (result.objects || []).filter(o => o.confidence > 0.5)
                                   .map(o => ({ label: o.label, confidence: o.confidence }))
  }
}
```

## Edge Cases
- `pipeline` is null (before `init()`): return empty arrays, no throw
- `result.faces/gestures/objects` undefined: default to `[]`

## Test Cases
1. Call `detect(el)` before `init()` → `{ faces: [], gestures: [], objects: [] }`
2. Call `detect(el)` after `init()` with mock pipeline → correct mapped output
3. Existing `on('face_detected', h)` + `start()` still fires handler
