# M84: Architecture Package Compliance — Technical Design

## Goal
Ensure all external packages (agentic-store, agentic-voice, agentic-sense) are properly declared in package.json and imported correctly. Fix npx entrypoint and CDN fallback.

## Tasks

### 1. agentic-store (task-1775536619023)
- Add `"agentic-store": "*"` to `package.json` dependencies
- `src/store/index.js` already imports from `'agentic-store'` — verify no local stub exists

### 2. agentic-voice (task-1775536622791)
- Add `"agentic-voice": "*"` to `package.json` dependencies
- `src/runtime/stt.js` and `tts.js` already use `import('agentic-voice/*')` dynamic imports — verify package is declared

### 3. agentic-sense (task-1775536627468)
- Add `"agentic-sense": "*"` to `package.json` dependencies
- Update `src/runtime/sense.js` to import from `'agentic-sense'` directly instead of `#agentic-sense` import map alias

### 4. npx bin entrypoint (task-1775536700459)
- Verify `bin/agentic-service.js` has `#!/usr/bin/env node` on line 1
- Verify `package.json` `bin` field is `{ "agentic-service": "bin/agentic-service.js" }`
- Ensure file mode is executable

### 5. CDN profiles fallback (task-1775536706050)
- `src/detector/profiles.js` already has 4-level fallback: cache → remote → expired cache → builtin
- Add test in `test/` covering the fetch-failure → builtin fallback path

## No architecture changes required.
