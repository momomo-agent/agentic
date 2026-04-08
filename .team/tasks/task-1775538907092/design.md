# Design: Fix TTS import paths to use package.json imports map

## File to Modify
- `src/runtime/tts.js` (lines 5–7)

## Change
Replace bare specifiers with `#`-prefixed imports map aliases:

```js
// Before
import('agentic-voice/kokoro')
import('agentic-voice/piper')
import('agentic-voice/openai-tts')

// After
import('#agentic-voice/kokoro')
import('#agentic-voice/piper')
import('#agentic-voice/openai-tts')
```

## Why
Node.js resolves `#`-prefixed specifiers via the `imports` field in `package.json`. The existing `package.json` already defines these mappings under `"imports"`. The bare `agentic-voice/*` paths bypass the imports map and fail to resolve.

## Edge Cases
- No logic changes — purely a path fix.
- If `package.json` `imports` map is missing an entry, the dynamic import will throw at runtime; no additional handling needed here.

## Test Verification
- `test/m43-agentic-voice.test.js` — `synthesize()` must not throw "not initialized"
