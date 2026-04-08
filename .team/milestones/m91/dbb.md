# M91 DBB — Architecture Doc Sync + agentic-sense Completion

## Verification Criteria

### 1. Architecture CR Submitted
- [ ] CR file exists at `.team/change-requests/cr-*.json` with `targetFile: "ARCHITECTURE.md"`
- [ ] CR covers: tunnel.js, src/cli/, HTTPS/middleware, VAD, agentic-embed modules
- [ ] CR status is `pending`

### 2. agentic-sense Wiring Complete
- [ ] No `#agentic-sense` import map references remain in any source file
- [ ] `src/runtime/adapters/sense.js` imports from `agentic-sense` directly
- [ ] `src/runtime/sense.js` loads without import errors
- [ ] `package.json` has `"agentic-sense"` in `dependencies`

### 3. Test Pass Rate >=90%
- [ ] `npm test` shows >= 90% pass rate (>= 591/657 tests passing)
- [ ] No file-level test errors
