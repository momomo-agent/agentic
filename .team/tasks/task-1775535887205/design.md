# Design: Fix TTS runtime test setup

## File to modify
- `test/m43-agentic-voice.test.js`

## Change
Add `init()` call before tests that exercise `synthesize()`:

```js
import * as tts from '../src/runtime/tts.js';
// at top of test file, before synthesize tests:
await tts.init();
```

Or mock the adapter module so `init()` is not needed:
```js
// mock agentic-voice/openai-tts before import
```

## Root cause
`tts.js` exports `adapter = null` until `init()` is called. Tests call `synthesize()` directly without initializing.

## Edge cases
- `init()` may throw if agentic-voice packages are not installed — mock the dynamic import
- Use `vi.mock` / manual mock of `agentic-voice/openai-tts` returning `{ synthesize: async () => Buffer.alloc(0) }`

## Test to verify
`test/m43-agentic-voice.test.js` — all synthesize tests pass without "not initialized" error
