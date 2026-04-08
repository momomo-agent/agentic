# Design: profiles/default.json

## Status
File already exists at `profiles/default.json` with 3 profiles.

## Structure
```json
{
  "version": "1.0.0",
  "profiles": [
    { "match": { "platform": "darwin", "arch": "arm64", "gpu": "apple-silicon", "minMemory": 16 }, "config": { ... } },
    { "match": { "platform": "linux", "gpu": "nvidia", "minMemory": 8 }, "config": { ... } },
    { "match": {}, "config": { "llm": { "provider": "ollama", "model": "gemma3:1b", "quantization": "q4" }, ... } }
  ]
}
```

## Matching Logic (in detector/profiles.js)
- Iterate profiles in order, return first match where all `match` fields satisfy hardware
- Empty `match: {}` is the universal fallback
- `minMemory` checked against `hardware.memory`

## Test Cases
- Apple Silicon 16GB → matches first profile (gemma4:26b q8)
- Linux NVIDIA 8GB → matches second profile (gemma4:13b q4)
- Any other hardware → matches fallback (gemma3:1b q4)
