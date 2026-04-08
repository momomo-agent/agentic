# Task Design: CDN profiles.json 7天缓存刷新

## File
- `src/detector/profiles.js` — cache expiry logic (already exists)

## Existing Logic (verify correct)
```js
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000  // 7 days

function isCacheExpired(timestamp) {
  return Date.now() - timestamp > CACHE_MAX_AGE
}

async function loadProfiles() {
  const cached = await loadCache()
  if (cached && !isCacheExpired(cached.timestamp)) return cached.data
  try {
    const remote = await fetchRemoteProfiles()
    await saveCache(remote)  // saveCache must write { data, timestamp: Date.now() }
    return remote
  } catch { /* fall through */ }
  if (cached) return cached.data   // expired cache as fallback
  return await loadBuiltinProfiles()
}
```

## saveCache must store timestamp
```js
async function saveCache(data) {
  await fs.mkdir(CACHE_DIR, { recursive: true })
  await fs.writeFile(CACHE_FILE, JSON.stringify({ data, timestamp: Date.now() }))
}
```

## Edge Cases
- Cache file missing → fetch remote, save
- Remote fetch fails + no cache → use builtin default.json
- Remote fetch fails + expired cache → use expired cache (warn)

## Test Cases
1. timestamp = Date.now() - 8 days → fetch called
2. timestamp = Date.now() - 1 day → fetch NOT called
3. fetch fails + no cache → loadBuiltinProfiles() called
