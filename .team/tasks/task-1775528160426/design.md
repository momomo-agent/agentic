# Design: agentic-sense and agentic-voice Package Confirmation

## Files
- `src/runtime/sense.js` (verify/fix)
- `src/runtime/stt.js` (verify/fix)
- `src/runtime/tts.js` (verify/fix)
- `package.json` (verify/add deps)

## Required Imports

### sense.js
```js
import { FaceDetector, GestureRecognizer } from 'agentic-sense'
```

### stt.js
```js
import { transcribe } from 'agentic-voice'
```

### tts.js
```js
import { synthesize } from 'agentic-voice'
```

## package.json
```json
"dependencies": {
  "agentic-sense": "*",
  "agentic-voice": "*"
}
```

## Fix Strategy
- If file uses inline stub instead of package import: replace stub with package import
- Preserve existing function signatures (`transcribe(audioBuffer) → text`, `synthesize(text) → audioBuffer`)

## Edge Cases
- Package not yet published: add as local path dep or note in CR
