# M61 DBB — cpu-only Profile + CDN Staleness

## DBB-001: cpu-only profile exists in default.json
- Given: profiles/default.json loaded
- Expect: entry with `gpu.type === 'none'` or `cpu-only` key present
- Verify: `node -e "const p=require('./profiles/default.json'); console.log(JSON.stringify(p['cpu-only'] || p.none))"` outputs non-null object

## DBB-002: cpu-only profile has valid llm/stt/tts fields
- Given: cpu-only profile entry
- Expect: `llm.provider`, `stt.provider`, `tts.provider` all defined
- Verify: all three fields are non-empty strings

## DBB-003: CDN profiles.json has 7-day staleness check
- Given: cached profiles.json older than 7 days
- Expect: fetch is triggered to refresh cache
- Verify: set mtime to 8 days ago, call `getProfile()`, observe network fetch in logs

## DBB-004: CDN staleness check does not block on fresh cache
- Given: cached profiles.json younger than 7 days
- Expect: no network fetch, returns cached data
- Verify: no HTTP request logged when cache is fresh
