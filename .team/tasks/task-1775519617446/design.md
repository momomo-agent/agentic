# Design: src/runtime/stt.js

## Interface
```js
export async function init(): Promise<void>
export async function transcribe(audioBuffer: Buffer): Promise<string>
```

## Logic
1. `init()`: `getProfile()` → select provider key → dynamic import adapter → fallback to default on error
2. `transcribe(buf)`: guard null/empty → `adapter.transcribe(buf)`

## Adapter Map
```js
{ sensevoice: 'agentic-voice/sensevoice', whisper: 'agentic-voice/whisper', default: 'agentic-voice/openai-whisper' }
```

## Error Handling
- Not initialized: throw `Error('not initialized')`
- Empty buffer: throw `Object.assign(new Error('empty audio'), { code: 'EMPTY_AUDIO' })`
- Adapter load failure: fall back to default

## Dependencies
- `../detector/profiles.js` → `getProfile()`

## Test Cases
- valid buffer → string
- null/empty buffer → EMPTY_AUDIO error
- missing adapter → falls back to default
