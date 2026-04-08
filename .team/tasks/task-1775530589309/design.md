# Design: Add cpu-only profile to profiles/default.json (m77)

## File to modify
- `profiles/default.json`

## Change
Insert before the `match: {}` catch-all entry:
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

## Test cases
- Hardware with `gpu.type === 'cpu-only'` matches this profile
- Returns `gemma2:2b` with `q4`
