# Design: config 热更新 — 远程 profiles 变更触发重载

## Files
- `src/detector/profiles.js` — add `watchProfiles(onReload)` export
- `src/runtime/llm.js` — call `watchProfiles` on startup, invalidate `_config` cache

## profiles.js addition
```js
// Poll remote every 30s; call onReload(newProfile) if etag/content changed
export function watchProfiles(hardware, onReload, interval = 30_000) {
  let lastEtag = null
  const timer = setInterval(async () => {
    try {
      const res = await fetch(PROFILES_URL, {
        signal: AbortSignal.timeout(5000),
        headers: { ...(lastEtag && { 'If-None-Match': lastEtag }) }
      })
      if (res.status === 304) return
      if (!res.ok) return
      lastEtag = res.headers.get('etag')
      const data = await res.json()
      await saveCache(data)
      const profile = matchProfile(data, hardware)
      onReload(profile)
    } catch { /* network error, skip */ }
  }, interval)
  return () => clearInterval(timer)  // returns stop fn
}
```

## llm.js addition
```js
import { watchProfiles } from '../detector/profiles.js'

// After first loadConfig() resolves, start watcher
loadConfig().then(cfg => {
  watchProfiles(cfg._hardware, (newProfile) => {
    _config = newProfile  // invalidate cache with new value
    console.log('[llm] config reloaded:', newProfile.llm.model)
  })
})
```

Store `hardware` on `_config` so watcher can re-match:
```js
async function loadConfig() {
  if (_config) return _config
  const hardware = await detectHardware()
  const profile = await getProfile(hardware)
  _config = { ...profile, _hardware: hardware }
  return _config
}
```

## Edge Cases
- Remote unreachable: skip silently, keep current config
- `304 Not Modified`: skip reload (etag check)
- In-flight requests during reload: they use the old `_config` snapshot captured at call start — safe

## Test Cases
1. Mock fetch returns new profile → `_config.llm.model` updates within poll interval
2. Mock fetch returns 304 → `_config` unchanged
3. Mock fetch throws → `_config` unchanged, no crash
