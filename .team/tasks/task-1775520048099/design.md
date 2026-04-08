# Design: src/runtime/tts.js — synthesize

## File
`src/runtime/tts.js`

## Exports
```js
export async function init(): Promise<void>
export async function synthesize(text: string): Promise<Buffer>
```

## Logic
1. `init()`: detect hardware → getProfile → pick provider (`kokoro` | `piper` | `default`)
2. Dynamic import adapter; fallback to `agentic-voice/openai-tts` on import error
3. `synthesize(text)`: guard `!adapter` → throw; guard empty/whitespace text → throw with `code:'EMPTY_TEXT'`; delegate to `adapter.synthesize(text)`

## Adapter map
```js
const ADAPTERS = {
  kokoro:  () => import('agentic-voice/kokoro'),
  piper:   () => import('agentic-voice/piper'),
  default: () => import('agentic-voice/openai-tts'),
}
```

## Error handling
- Import failure → fallback to `default`
- Empty text → `{code:'EMPTY_TEXT'}` (caller returns HTTP 400)
- Adapter errors propagate

## Dependencies
- `src/detector/hardware.js`, `src/detector/profiles.js`
- `agentic-voice/*` packages
