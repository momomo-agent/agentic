# Task Design: Verify CDN fallback and agentic-store integration

## Objective
Verify remote profiles CDN fallback works (4-tier chain) and agentic-store init/get/set/del work end-to-end. PRD/Architecture gaps: CDN fallback partial, agentic-store integration partial.

## Part 1: CDN Fallback Verification

### Key File
`src/detector/profiles.js` — contains `loadProfiles()` with 4-tier fallback:

```javascript
// Fallback chain in loadProfiles():
// Tier 1: Cache — reads ~/.agentic-service/profiles.json (7-day TTL)
// Tier 2: Remote — fetch(PROFILES_URL, { signal: AbortSignal.timeout(5000) })
// Tier 3: Expired cache — uses stale cache if remote fails
// Tier 4: Built-in — falls back to profiles/default.json bundled with package

const PROFILES_URL = process.env.PROFILES_URL ||
  'https://raw.githubusercontent.com/momo-ai/agentic-service/main/profiles/default.json';

export function loadProfiles() → Promise<ProfilesData>
export function fetchRemoteProfiles() → Promise<ProfilesData | null>
export function watchProfiles(hardware, onReload, interval?) → () => void
```

### Verification Steps
1. Run existing CDN fallback tests:
   ```bash
   npx vitest run test/m19-profiles-cdn.test.js         # CDN URL not placeholder, env var override
   npx vitest run test/m30-cdn-profiles.test.js          # fallback chain, cache TTL
   npx vitest run test/m28-profiles-cache.test.js        # cache staleness
   npx vitest run test/detector/profiles.test.js         # general profiles tests
   npx vitest run test/detector/profiles-edge-cases.test.js # edge cases
   ```
2. Verify each tier works:
   - Tier 1: Cache hit returns immediately (mock fs.readFile returns valid JSON)
   - Tier 2: Remote fetch succeeds (mock fetch returns profiles data)
   - Tier 3: Remote fails + expired cache → uses stale cache (mock fetch throws)
   - Tier 4: Remote fails + no cache → uses built-in default.json

3. Verify `watchProfiles()`:
   - ETag-based conditional fetch (`If-None-Match` header)
   - Calls `onReload(matchProfile(data, hardware))` on change
   - Returns cleanup function that clears interval

### Edge Cases
- Network timeout (5s AbortSignal) → falls back to cache or builtin
- Malformed JSON in cache → should not crash, should fall through to next tier
- PROFILES_URL env var override → uses custom CDN URL

## Part 2: agentic-store Integration Verification

### Key File
`src/store/index.js` — thin wrapper around agentic-store package:

```javascript
import { open } from 'agentic-store'

async function getStore() → Promise<Store>   // singleton, opens ~/.agentic-service/store.db
export async function get(key: string) → Promise<any>     // JSON.parse(read(key))
export async function set(key: string, value: any) → Promise<void>  // write(key, JSON.stringify(value))
export async function del(key: string) → Promise<void>     // delete(key)
export { del as delete }
```

### Verification Steps
1. Run existing store tests:
   ```bash
   npx vitest run test/m64-agentic-store.test.js
   npx vitest run test/m77-store-wiring.test.js
   npx vitest run test/m84-agentic-store-wiring.test.js
   npx vitest run test/store/index.test.js
   ```
2. Verify end-to-end operations:
   - `set('test-key', { hello: 'world' })` → persists to store
   - `get('test-key')` → returns `{ hello: 'world' }`
   - `del('test-key')` → removes entry
   - `get('nonexistent')` → returns `null`
3. Verify `runtime/memory.js` integration:
   - `add(text)` → embeds + stores with `mem:` prefix ID
   - `search(query, topK)` → cosine similarity over stored vectors
   - `remove(key)` → deletes from store + index

### Edge Cases
- agentic-store package not installed → import error (should be in dependencies)
- Store file locked by another process → handle gracefully
- Large values → JSON stringify/parse should handle up to reasonable size

## Verification Tests to Run
```bash
# CDN fallback
npx vitest run test/detector/profiles*.test.js
npx vitest run test/detector/hot-reload.test.js

# agentic-store
npx vitest run test/m64-agentic-store.test.js
npx vitest run test/m77-store-wiring.test.js
npx vitest run test/m84-agentic-store-wiring.test.js
npx vitest run test/store/index.test.js

# memory integration
npx vitest run test/runtime/memory*.test.js
```

## Dependencies
- No code changes expected — verification only
- If tests fail due to missing packages, file follow-up tasks
