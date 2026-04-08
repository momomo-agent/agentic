# Design: Wire agentic-sense as external package dependency

## Files to Modify
- `package.json` — add `"#agentic-sense": "./src/runtime/adapters/sense.js"` to `imports`
- `src/runtime/sense.js` — change `import agenticSenseModule from 'agentic-sense'` to `import { createPipeline } from '#agentic-sense'`

## Changes

### package.json imports
```json
"imports": {
  "#agentic-embed": "./src/runtime/adapters/embed.js",
  "#agentic-sense": "./src/runtime/adapters/sense.js"
}
```

### src/runtime/sense.js
Replace bare `'agentic-sense'` import with `'#agentic-sense'` adapter import.
Use `createPipeline` from adapter instead of direct `AgenticSense` instantiation.

## Verification
```bash
node --input-type=module <<< "import '#agentic-sense'"
# exits 0
```

## Edge Cases
- `src/runtime/adapters/sense.js` already exists — no new file needed
- `agentic-sense` stays in `dependencies` (runtime dep); import map just redirects to adapter
