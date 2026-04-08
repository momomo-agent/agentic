# M89 DBB — agentic-sense Wiring + Test Pass Rate >=90%

## Done-By-Definition Criteria

### 1. agentic-sense npm Wiring
- [ ] `package.json` dependencies includes `"agentic-sense": "file:./vendor/agentic-sense.tgz"` (not just in imports map)
- [ ] `src/runtime/adapters/sense.js` imports from `agentic-sense` directly (no `#agentic-sense` alias)
- [ ] `npm install` resolves `agentic-sense` without errors
- [ ] `src/runtime/sense.js` loads without import errors

### 2. Test Pass Rate >=90%
- [ ] `npm test` shows pass rate >= 90% (currently 705/781 = 90.3% tests pass, 69 failing)
- [ ] No more than 78 tests failing out of 781 total
- [ ] All test file errors (currently 2) resolved
