# Design: src/runtime/stt+tts.js

## Files
- `src/runtime/stt.js` (exists)
- `src/runtime/tts.js` (exists)

## Status
Both files are fully implemented. Verify correctness only.

## stt.js
```js
init() → void          // loads adapter from profile.stt.provider
transcribe(audioBuffer: Buffer) → Promise<string>
// throws { code: 'EMPTY_AUDIO' } if buffer empty
// adapter fallback: sensevoice → whisper → openai-whisper
```

## tts.js
```js
init() → void          // loads adapter from profile.tts.provider
synthesize(text: string) → Promise<Buffer>
// throws { code: 'EMPTY_TEXT' } if text empty/whitespace
// adapter fallback: kokoro → piper → openai-tts
```

## Edge Cases
- `init()` not called → throws 'not initialized'
- Unknown provider → falls back to default adapter
- Adapter import fails → falls back to default adapter

## Tests
- transcribe(validBuffer) → string
- transcribe(Buffer.alloc(0)) → throws EMPTY_AUDIO
- synthesize('hello') → Buffer
- synthesize('') → throws EMPTY_TEXT
