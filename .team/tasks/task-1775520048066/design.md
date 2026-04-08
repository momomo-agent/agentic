# Design: src/runtime/stt.js — transcribe

## File
`src/runtime/stt.js`

## Exports
```js
export async function init(): Promise<void>
export async function transcribe(audioBuffer: Buffer): Promise<string>
```

## Logic
1. `init()`: detect hardware → getProfile → pick provider (`sensevoice` | `whisper` | `default`)
2. Dynamic import adapter from `ADAPTERS` map; fallback to `agentic-voice/openai-whisper` on import error
3. `transcribe(audioBuffer)`: guard `!adapter` → throw `Error('not initialized')`; guard empty buffer → throw with `code:'EMPTY_AUDIO'`; delegate to `adapter.transcribe(audioBuffer)`

## Adapter map
```js
const ADAPTERS = {
  sensevoice: () => import('agentic-voice/sensevoice'),
  whisper:    () => import('agentic-voice/whisper'),
  default:    () => import('agentic-voice/openai-whisper'),
}
```

## Error handling
- Import failure → fallback to `default` adapter
- Empty buffer → `{code:'EMPTY_AUDIO'}` error (caller returns HTTP 400)
- Adapter errors propagate to caller

## Dependencies
- `src/detector/hardware.js`, `src/detector/profiles.js`
- `agentic-voice/*` packages
