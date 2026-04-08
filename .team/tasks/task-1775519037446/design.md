# Design: src/runtime/stt.js

## File
`src/runtime/stt.js` — already exists, verify completeness

## Current Implementation
- `init()` — loads adapter from profile (sensevoice/whisper/default)
- `transcribe(audioBuffer)` — delegates to adapter, validates non-empty buffer

## Interface
```js
export async function init(): Promise<void>
export async function transcribe(audioBuffer: Buffer): Promise<string>
```

## Logic
1. `init()`: read profile via `getProfile()`, select adapter key, dynamic import, fallback to `default` on import error
2. `transcribe(buf)`: guard `!adapter` → throw `Error('not initialized')`, guard empty → throw with `code: 'EMPTY_AUDIO'`, delegate to `adapter.transcribe(buf)`

## Edge Cases
- `init()` called before profile ready → use `default` adapter
- Adapter import fails → fallback to `default`
- Empty buffer → `{ code: 'EMPTY_AUDIO' }` error (api.js returns 400)

## Dependencies
- `../detector/profiles.js` → `getProfile()`
- `agentic-voice/sensevoice`, `agentic-voice/whisper`, `agentic-voice/openai-whisper`

## Tests
- `transcribe(Buffer.alloc(0))` → throws with `code: 'EMPTY_AUDIO'`
- `transcribe(validBuf)` without `init()` → throws `'not initialized'`
- After `init()`, `transcribe(validBuf)` → returns string
