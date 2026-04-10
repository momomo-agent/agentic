# Fix stale import-map tests — m76-embed-wiring + m77-sense-imports

## Progress

### Completed
- `m76-embed-wiring.test.js`: Changed test from asserting `#agentic-embed` import map exists to asserting it does NOT exist (removed in b4c9d5ce). Updated `import('#agentic-embed')` to `import('agentic-embed')` checking `localEmbed` export.
- `m77-sense-imports.test.js`: Replaced `pkg.imports` existence check with `agentic-sense` in `dependencies` check.
- All 6 assertions pass. Full suite: 168 passed, 1 pre-existing failure (m28-profiles-cache, unrelated).
- Committed: `fix: update stale tests to reflect removed #agentic-embed import map`
