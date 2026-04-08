# Design: src/runtime/sense+memory.js

## Files
- `src/runtime/sense.js` (exists)
- `src/runtime/memory.js` (exists)

## sense.js
```js
init(videoElement) → Promise<void>     // browser: pipeline + video
initHeadless(options?) → Promise<void> // server: pipeline only
start() → void                         // begin 100ms polling
stop() → void                          // clear interval + pipeline
detect(frame) → { faces, gestures, objects }
detectFrame(buffer) → { faces, gestures, objects }  // null-safe
on(type, handler) → void               // event subscription
```
Object confidence threshold: 0.5. `detectFrame(null)` returns empty result.

## memory.js
```js
add(text: string) → Promise<void>      // embed + store + update index
search(query: string, topK=5) → Promise<{text, score}[]>
remove(key: string) → Promise<void>    // del + update index
```
Sequential lock via `_lock` promise chain. Cosine similarity scoring.

## Edge Cases
- `detect()` before `init()` → returns empty result
- `search('')` → returns []
- `search()` with empty index → returns []
- Concurrent `add()` calls → serialized via lock

## Tests
- detect(mockFrame) → { faces:[...], gestures:[...], objects:[...] }
- detectFrame(null) → { faces:[], gestures:[], objects:[] }
- add('hello') then search('hello') → score > 0
- remove(key) → not in search results
