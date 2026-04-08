# Design: profiles.js getProfile + cpu-only profile

## Files
- `profiles/default.json` — add cpu-only profile entry
- `src/detector/profiles.js` — verify getProfile(hardware) works (no code change expected)

## Change to profiles/default.json

Add a cpu-only entry as the last profile (lowest priority, acts as fallback):

```json
{
  "match": {},
  "config": {
    "llm": { "provider": "ollama", "model": "gemma3:1b", "quantization": "q4" },
    "stt": { "provider": "sensevoice", "model": "small" },
    "tts": { "provider": "kokoro", "voice": "default" },
    "fallback": { "provider": "openai", "model": "gpt-4o-mini" }
  }
}
```

Empty `match: {}` scores 1 (lowest) in matcher.js — acts as universal fallback.

## Algorithm
- matcher.js already returns score=1 for empty match criteria
- No code changes needed in profiles.js or matcher.js
- Only profiles/default.json needs the new entry appended

## Edge Cases
- `{ gpu: null }` or `{ gpu: { type: 'none' } }` — no existing entry matches gpu='none', falls through to cpu-only
- `{}` empty hardware — same fallback path
- Unknown gpu type — same fallback path

## Test Cases (DBB-003 to DBB-006)
- `getProfile({ gpu: { type: 'apple-silicon' }, memory: 16, platform: 'darwin', arch: 'arm64' })` → returns profile with llm.model
- `getProfile({ gpu: { type: 'nvidia' }, memory: 8, platform: 'linux' })` → returns profile with llm.model
- `getProfile({ gpu: { type: 'none' }, memory: 8 })` → returns cpu-only profile (gemma3:1b)
- `getProfile({})` → returns default profile, no exception
