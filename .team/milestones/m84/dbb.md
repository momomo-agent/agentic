# M84 DBB — Architecture Package Compliance

## Verification Criteria

### 1. agentic-store wired as external package
- [ ] `package.json` has `"agentic-store"` in `dependencies`
- [ ] `src/store/index.js` imports from `'agentic-store'` (not a local stub)
- [ ] `get()`, `set()`, `del()` work via the external package

### 2. agentic-voice wired as external package
- [ ] `package.json` has `"agentic-voice"` in `dependencies`
- [ ] `src/runtime/stt.js` imports adapters from `'agentic-voice/*'`
- [ ] `src/runtime/tts.js` imports adapters from `'agentic-voice/*'`
- [ ] No local voice stubs remain in use

### 3. agentic-sense wired as external package
- [ ] `package.json` has `"agentic-sense"` in `dependencies`
- [ ] `src/runtime/sense.js` imports from `'agentic-sense'` (not `#agentic-sense` import map)
- [ ] No local sense stubs remain in use

### 4. npx bin entrypoint works
- [ ] `package.json` `bin` field points to `bin/agentic-service.js`
- [ ] `bin/agentic-service.js` has `#!/usr/bin/env node` shebang
- [ ] File is executable (`chmod +x`)
- [ ] `node bin/agentic-service.js --help` exits 0

### 5. CDN profiles.json fallback
- [ ] `src/detector/profiles.js` falls back to `profiles/default.json` when CDN fetch fails
- [ ] Fallback also triggers on timeout (5s)
- [ ] Test covers the fallback path and returns valid profile data
