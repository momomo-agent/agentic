# Design: 配置热更新 — watchProfiles → loadConfig自动重载

## File to Modify
`src/detector/profiles.js`

## Analysis
`watchProfiles(hardware, onReload, interval)` already exists and polls remote profiles via ETag.
The task requires ensuring it is wired into the startup flow so config reloads automatically.

## Change
The existing `watchProfiles` implementation is correct. The missing piece is calling it from the startup entry point (`bin/agentic-service.js` or `src/server/api.js`) after initial config load:

```javascript
// After initial getProfile(hardware) call:
const stopWatch = watchProfiles(hardware, (newProfile) => {
  currentProfile = newProfile; // atomic reference swap
  console.log('[profiles] config reloaded:', newProfile.llm?.model);
});
```

`currentProfile` must be a module-level `let` variable (not `const`) so the swap is safe for in-flight requests — they hold a reference to the old object until they complete.

## Edge Cases
- Network error during poll: `watchProfiles` already swallows errors silently — no crash
- Invalid JSON from remote: `res.json()` throws → caught by try/catch in watcher → previous config retained
- `onReload` called only when fetch succeeds and status !== 304 (ETag dedup)

## Test Cases (DBB)
- DBB-008: remote profiles change → `onReload` fires → new config used for subsequent requests
- DBB-009: remote returns malformed JSON → error swallowed → previous config unchanged, service stays up
