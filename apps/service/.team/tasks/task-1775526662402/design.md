# Design: cpu-only profile in profiles/default.json

## File to modify
`profiles/default.json`

## Change
Add a cpu-only entry to the `profiles` array with a match that catches hardware where `gpu.type === 'none'`:

```json
{
  "match": { "gpu": "none" },
  "config": {
    "llm": { "provider": "ollama", "model": "gemma2:2b", "quantization": "q4" },
    "stt": { "provider": "sensevoice", "model": "small" },
    "tts": { "provider": "kokoro", "voice": "default" },
    "fallback": { "provider": "openai", "model": "gpt-4o-mini" }
  }
}
```

Place before the catch-all `"match": {}` entry so it takes priority.

## File to modify
`src/detector/matcher.js` (or wherever `matchProfile` is defined)

- Ensure `hardware.gpu.type === 'none'` matches `profile.match.gpu === 'none'`

## Edge cases
- Hardware with no GPU field at all → falls through to catch-all (acceptable)
- Multiple cpu-only entries → first match wins (array order)

## Test cases
- `matchProfile(profiles, { gpu: { type: 'none' }, memory: 8 })` → returns gemma2:2b config
- `matchProfile(profiles, { gpu: { type: 'apple-silicon' }, memory: 16 })` → returns gemma4:26b config
