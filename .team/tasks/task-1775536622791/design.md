# Design: Wire agentic-voice as external package

## Files to modify
- `package.json` — add `"agentic-voice"` to dependencies
- `src/runtime/stt.js` — already uses `import('agentic-voice/*')` dynamic imports; verify package declared
- `src/runtime/tts.js` — already uses `import('agentic-voice/*')` dynamic imports; verify package declared

## Steps
1. Check `package.json` dependencies for `agentic-voice`; if missing, add `"agentic-voice": "*"`
2. Confirm `src/runtime/stt.js` ADAPTERS map uses `import('agentic-voice/sensevoice')` etc. — no local stubs
3. Confirm `src/runtime/tts.js` ADAPTERS map uses `import('agentic-voice/kokoro')` etc. — no local stubs
4. Remove any local adapter files under `src/runtime/adapters/` that duplicate voice functionality

## Current ADAPTERS in stt.js (already correct)
```js
const ADAPTERS = {
  sensevoice: () => import('agentic-voice/sensevoice'),
  whisper:    () => import('agentic-voice/whisper'),
  default:    () => import('agentic-voice/openai-whisper'),
};
```

## Edge cases
- If `src/runtime/adapters/` contains local voice stubs, delete them
- The `default` adapter must remain as cloud fallback

## Test cases
- `init()` resolves without throwing when package is installed
- `transcribe(buffer)` / `synthesize(text)` delegate to adapter methods
