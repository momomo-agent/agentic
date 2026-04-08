# Progress

## Done
- Added `isNodeEnv()` helper to shell.ts (exported)
- Guarded `executeShell` with `isNodeEnv()` check — returns error in browser
- Updated `buildToolDefs` in ask.ts to gate shell registration: `tools.includes('shell') && isNodeEnv()`
- Build passes
