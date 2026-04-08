# Design: cpu-only profile in profiles/default.json

## File to modify
- `profiles/default.json`

## Current state
Has `{ "match": { "gpu": "none" } }` entry — this already covers cpu-only.
Verify it has appropriate model/quantization for CPU-only hardware.

## Required change
Ensure the `gpu: "none"` profile entry specifies:
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

## Note
Current file already has this entry. Task is to verify it exists and matches the above.
If `getProfile()` in `src/detector/profiles.js` matches on `gpu.type === hardware.gpu`, confirm the match key aligns.

## Test cases
- `getProfile({ gpu: { type: 'none' }, memory: 8, cpu: { cores: 4 } })` → returns gemma2:2b profile
