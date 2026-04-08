# M70 Technical Design — Vision Completeness

## Tasks

### 1. Voice Latency Benchmark (task-1775528154806)
Create `test/latency.test.js` that:
- Calls `runtime/stt.js` with a short audio buffer
- Pipes result to `runtime/llm.js` chat
- Pipes LLM output to `runtime/tts.js`
- Measures wall-clock time, asserts <= 2000ms

### 2. npx Entrypoint (task-1775528160390)
Verify/fix `bin/agentic-service.js`:
- Must have `#!/usr/bin/env node`
- Must call `src/server/api.js` start
- `package.json` `bin` field must point to it

### 3. External Package Wrappers (task-1775528160426)
- `src/runtime/sense.js` → `import { ... } from 'agentic-sense'`
- `src/runtime/stt.js` → `import { ... } from 'agentic-voice'`
- `src/runtime/tts.js` → `import { ... } from 'agentic-voice'`
- Add missing deps to `package.json` if absent

### 4. README Audit (task-1775528160458)
Sections required: Install, Quick Start, Configuration, API Reference.
Update README.md in-place; do not rewrite sections that already exist.
