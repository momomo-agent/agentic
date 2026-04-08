# M84 DBB Check — Architecture Package Compliance

**Match Score: 80%**
**Timestamp: 2026-04-07T10:36:41Z**

## Summary

M84 aimed to wire architecture packages (agentic-store, agentic-voice, agentic-sense) as external dependencies and ensure npx bin entrypoint works. Current status shows strong progress with 14 of 17 criteria passing.

## Criteria Evaluation

### 1. agentic-store wired as external package ✅

- [x] **package.json has "agentic-store" in dependencies** — PASS
  - Evidence: Line 47 in package.json: `"agentic-store": "*"`
- [x] **src/store/index.js imports from 'agentic-store'** — PASS
  - Evidence: Line 1: `import { open } from 'agentic-store'`
- [x] **get(), set(), del() work via the external package** — PASS
  - Evidence: Functions implemented using external package API

### 2. agentic-voice wired as external package ✅

- [x] **package.json has "agentic-voice" in dependencies** — PASS
  - Evidence: Line 49 in package.json: `"agentic-voice": "*"`
- [x] **src/runtime/stt.js imports adapters from 'agentic-voice/*'** — PASS
  - Evidence: Lines 5-7 use dynamic imports: `import('agentic-voice/sensevoice')`, etc.
- [x] **src/runtime/tts.js imports adapters from 'agentic-voice/*'** — PASS
  - Evidence: Lines 5-7 use dynamic imports: `import('agentic-voice/kokoro')`, etc.
- [x] **No local voice stubs remain in use** — PASS
  - Evidence: All voice imports use external package paths

### 3. agentic-sense wired as external package ❌

- [ ] **package.json has "agentic-sense" in dependencies** — FAIL
  - Evidence: Missing from dependencies section (only agentic-store, agentic-embed, agentic-voice present)
  - Gap: Need to add `"agentic-sense": "*"` to dependencies
- [ ] **src/runtime/sense.js imports from 'agentic-sense'** — FAIL
  - Evidence: Line 1 uses import map: `import { createPipeline } from '#agentic-sense'`
  - Gap: Should be `import { createPipeline } from 'agentic-sense'`
- [~] **No local sense stubs remain in use** — PARTIAL
  - Evidence: Import map `#agentic-sense` points to local stub at `./src/runtime/adapters/sense.js`
  - Gap: Need to remove import map and use external package

### 4. npx bin entrypoint works ✅

- [x] **package.json bin field points to bin/agentic-service.js** — PASS
  - Evidence: Lines 7-9 in package.json: `"bin": { "agentic-service": "bin/agentic-service.js" }`
- [x] **bin/agentic-service.js has #!/usr/bin/env node shebang** — PASS
  - Evidence: Line 1: `#!/usr/bin/env node`
- [x] **File is executable (chmod +x)** — PASS
  - Evidence: `ls -la` shows `-rwx------` permissions
- [x] **node bin/agentic-service.js --help exits 0** — PASS
  - Evidence: Help command executes successfully and displays usage information

### 5. CDN profiles.json fallback ✅

- [x] **src/detector/profiles.js falls back to profiles/default.json when CDN fetch fails** — PASS
  - Evidence: Lines 47-49 implement fallback: `loadBuiltinProfiles()` called when remote fetch fails
- [x] **Fallback also triggers on timeout (5s)** — PASS
  - Evidence: Line 59: `signal: AbortSignal.timeout(5000)` implements 5-second timeout
- [x] **Test covers the fallback path and returns valid profile data** — PASS
  - Evidence: test/server/m9-dbb.test.js includes fallback test case

## Gaps Summary

1. **agentic-sense package not in dependencies** — Need to add to package.json
2. **sense.js still uses import map** — Need to change from `#agentic-sense` to `agentic-sense`
3. **Local sense stub still referenced** — Import map in package.json needs removal

## Next Actions

1. Add `"agentic-sense": "*"` to package.json dependencies
2. Update src/runtime/sense.js to import from `'agentic-sense'` instead of `'#agentic-sense'`
3. Remove `"#agentic-sense": "./src/runtime/adapters/sense.js"` from package.json imports map
4. Verify tests pass after migration

## Acceptance

- [x] agentic-store wired as external package (3/3 criteria)
- [x] agentic-voice wired as external package (4/4 criteria)
- [ ] agentic-sense wired as external package (0/3 criteria) — **BLOCKED**
- [x] npx bin entrypoint works (4/4 criteria)
- [x] CDN profiles.json fallback (3/3 criteria)

**Overall: 14/17 criteria passing (82.4%)**
