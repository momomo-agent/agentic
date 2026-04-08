# Design: /api/perf Endpoint

## Context
`src/server/api.js` has existing routes. `src/runtime/profiler.js` will have `getMetrics()` after task-1775572892189.

## File
- **modify** `src/server/api.js`

## Change
Add import and route:
```js
import { getMetrics } from '../runtime/profiler.js';

// GET /api/perf
router.get('/perf', (_req, res) => res.json(getMetrics()));
```

## Response Shape
```json
{ "stt": { "last": 80, "avg": 82, "count": 5 }, "llm": { "last": 300, "avg": 310, "count": 5 }, "tts": { "last": 80, "avg": 79, "count": 5 } }
```
Returns `{}` before any pipeline calls.

## Dependencies
- task-1775572892189 must be done first (`getMetrics` must exist in profiler.js)

## Test Cases
- `GET /api/perf` returns 200 with JSON object
- Returns `{}` when no metrics recorded yet
