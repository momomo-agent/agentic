# Design: Add cpu-only profile to profiles/default.json

## File to modify
- `profiles/default.json`

## Change
Add a new profile entry after the `nvidia` entry and before the `gpu: "none"` fallback:

```json
{
  "match": { "gpu": "cpu-only" },
  "config": {
    "llm": { "provider": "ollama", "model": "gemma2:2b", "quantization": "q4" },
    "stt": { "provider": "sensevoice", "model": "small" },
    "tts": { "provider": "kokoro", "voice": "default" },
    "fallback": { "provider": "openai", "model": "gpt-4o-mini" }
  }
}
```

## Logic
`getProfile(hardware)` in `src/detector/profiles.js` matches profiles in order. The `cpu-only` entry must appear before the catch-all `{}` match.

## Test cases
- `getProfile({ gpu: { type: 'cpu-only' } })` → returns `gemma2:2b` config
- Existing apple-silicon and nvidia profiles unaffected
