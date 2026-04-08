# Design: src/runtime/tts.js

## File
`src/runtime/tts.js` — already exists, verify completeness

## Current Implementation
- `init()` — loads adapter from profile (kokoro/piper/default)
- `synthesize(text)` — delegates to adapter, validates non-empty text

## Interface
```js
export async function init(): Promise<void>
export async function synthesize(text: string): Promise<Buffer>
```

## Logic
1. `init()`: read profile, select adapter, dynamic import, fallback to `default`
2. `synthesize(text)`: guard `!adapter` → throw `Error('not initialized')`, guard blank → throw with `code: 'EMPTY_TEXT'`, delegate to `adapter.synthesize(text)`

## Edge Cases
- Adapter import fails → fallback to `default` (openai-tts)
- Whitespace-only text → `{ code: 'EMPTY_TEXT' }` error (api.js returns 400)

## Dependencies
- `../detector/profiles.js` → `getProfile()`
- `agentic-voice/kokoro`, `agentic-voice/piper`, `agentic-voice/openai-tts`

## Tests
- `synthesize('')` → throws with `code: 'EMPTY_TEXT'`
- `synthesize('  ')` → throws with `code: 'EMPTY_TEXT'`
- `synthesize('hello')` without `init()` → throws `'not initialized'`
- After `init()`, `synthesize('hello')` → returns Buffer
