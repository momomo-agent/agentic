# Design: agentic-voice package integration — stt.js + tts.js

## Problem
`agentic-voice` is not in `package.json` dependencies. `stt.js` and `tts.js` import from `agentic-voice/*` subpaths. Without the package, runtime will fail on `init()`.

## Approach
Add `agentic-voice` to `package.json` dependencies. If the package does not exist on npm, implement a local adapter at `src/runtime/adapters/voice/` that satisfies the interface consumed by `stt.js` and `tts.js`.

## Files to Modify

### Option A — package exists on npm
- `package.json` — add `"agentic-voice": "latest"` to `dependencies`

### Option B — package not on npm (local adapter)
- `src/runtime/adapters/voice/openai-whisper.js` — STT default adapter
- `src/runtime/adapters/voice/openai-tts.js` — TTS default adapter
- `src/runtime/adapters/voice/sensevoice.js` — STT sensevoice stub
- `src/runtime/adapters/voice/kokoro.js` — TTS kokoro stub
- `src/runtime/adapters/voice/piper.js` — TTS piper stub
- `package.json` — add import map or path alias so `agentic-voice/*` resolves to `src/runtime/adapters/voice/*`

## Interface Contracts

Each STT adapter must export:
```js
// transcribe(audioBuffer: Buffer) → Promise<string>
export async function transcribe(audioBuffer) { ... }
```

Each TTS adapter must export:
```js
// synthesize(text: string) → Promise<Buffer>
export async function synthesize(text) { ... }
```

## Resolution Steps
1. Run `npm info agentic-voice` to check if package exists on npm
2. If yes: add to `package.json` dependencies, run `npm install`
3. If no: create local adapters under `src/runtime/adapters/voice/`, add `imports` field to `package.json`:
   ```json
   "imports": {
     "agentic-voice/openai-whisper": "./src/runtime/adapters/voice/openai-whisper.js",
     "agentic-voice/openai-tts":     "./src/runtime/adapters/voice/openai-tts.js",
     "agentic-voice/sensevoice":     "./src/runtime/adapters/voice/sensevoice.js",
     "agentic-voice/kokoro":         "./src/runtime/adapters/voice/kokoro.js",
     "agentic-voice/whisper":        "./src/runtime/adapters/voice/openai-whisper.js",
     "agentic-voice/piper":          "./src/runtime/adapters/voice/piper.js"
   }
   ```

## Default Adapter Implementation (openai-whisper + openai-tts)
Use `OPENAI_API_KEY` env var. If missing, throw with `{ code: 'NO_API_KEY' }`.

```js
// openai-whisper.js
export async function transcribe(audioBuffer) {
  // POST audioBuffer to https://api.openai.com/v1/audio/transcriptions
  // model: whisper-1, return text string
}

// openai-tts.js
export async function synthesize(text) {
  // POST to https://api.openai.com/v1/audio/speech
  // model: tts-1, voice: alloy, return Buffer (mp3)
}
```

## Edge Cases
- `stt.js` and `tts.js` already handle adapter load failure by falling back to `ADAPTERS.default` — local adapters must not throw on import, only on call
- Empty audio / empty text are already validated upstream in `stt.js`/`tts.js`

## Test Cases
1. `init()` resolves without throwing when adapter loads
2. `transcribe(validBuffer)` returns a non-empty string
3. `synthesize('hello')` returns a Buffer with length > 0
4. `init()` falls back to default adapter when provider-specific adapter fails to load
