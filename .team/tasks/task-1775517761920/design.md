# Design: src/runtime/stt.js

## File
`src/runtime/stt.js`

## Interface
```js
async function transcribe(audioBuffer)
// audioBuffer: Buffer (WAV/PCM)
// returns: { text: string }
```

## Logic
1. Load profile via `src/detector/profiles.js` → get `profile.stt`
2. Call `agentic-voice` STT with `{ provider, model, audio: audioBuffer }`
3. Return `{ text: result.text }`
4. On error → return `{ text: '', error: err.message }`

## Dependencies
- `agentic-voice` — STT interface
- `src/detector/profiles.js`

## Test Cases
- Valid WAV buffer → returns `{ text: '...' }`
- Empty buffer → returns `{ text: '', error: '...' }`
- agentic-voice unavailable → returns `{ text: '', error: '...' }` (no throw)
