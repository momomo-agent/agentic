# Design: profiles/default.json

## File
- `profiles/default.json` (exists)

## Structure
```json
{
  "version": "1.0.0",
  "profiles": [
    { "match": { "platform": "darwin", "arch": "arm64", "gpu": "apple-silicon", "minMemory": 16 }, "config": {...} },
    { "match": { "platform": "linux", "gpu": "nvidia", "minMemory": 8 }, "config": {...} },
    { "match": {}, "config": {...} }  // catch-all fallback
  ]
}
```

## Usage in profiles.js
`getProfile(hardware)` iterates profiles, matches hardware fields, returns first match config.
Empty `match: {}` always matches — must be last entry.

## Verification
- File exists and is valid JSON
- `getProfile()` returns config when CDN fetch fails (offline)
- Catch-all profile covers any hardware not matched above
