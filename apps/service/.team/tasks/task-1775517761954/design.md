# Design: src/runtime/tts.js

## File
`src/runtime/tts.js`

## Interface
```js
async function synthesize(text)
// text: string
// returns: Buffer (WAV)
// throws: Error on failure
```

## Logic
1. Load profile → get `profile.tts`
2. Call `agentic-voice` TTS with `{ provider, voice, text }`
3. Return audio Buffer
4. On error → throw Error with message

## Dependencies
- `agentic-voice` — TTS interface
- `src/detector/profiles.js`

## Test Cases
- Valid text → returns Buffer with length > 0
- Empty string → throws Error
- agentic-voice unavailable → throws Error
