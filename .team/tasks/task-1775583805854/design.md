# Design: Verify agentic-voice STT/TTS resolves

## Problem
`agentic-voice` package has only `index.js` — no subpath exports.
`import('agentic-voice/openai-whisper')` and `import('agentic-voice/openai-tts')` will throw at runtime.

## Files to modify
- `test/stt.test.js` — mock `agentic-voice/openai-whisper` subpath
- `test/tts.test.js` — mock `agentic-voice/openai-tts` subpath

## Fix approach
Use vitest module mocking before the import:
```js
vi.mock('agentic-voice/openai-whisper', () => ({ transcribe: vi.fn().mockResolvedValue('text') }))
vi.mock('agentic-voice/openai-tts', () => ({ synthesize: vi.fn().mockResolvedValue(Buffer.alloc(0)) }))
```

## Edge cases
- If tests already mock these, verify mock shape matches what `stt.js`/`tts.js` expects (`adapter.transcribe`, `adapter.synthesize`)
- `tts.js` checks `mod.synthesize ? mod : mod.default` — mock must export `synthesize` directly

## Test cases
- STT: `transcribe(buffer)` returns string without import error
- TTS: `synthesize(text)` returns buffer without import error
