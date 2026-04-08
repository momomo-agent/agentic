# DBB Check — M20

**Match: 100/100** | 2026-04-08T12:00:00Z

## Results

| Criterion | Status |
|-----------|--------|
| DBB-001: shell_exec excluded in browser environments | pass |
| DBB-002: shell_exec works normally in Node.js | pass |
| DBB-003: ask() works without filesystem config | pass |
| DBB-004: Explicit filesystem config still works | pass |
| DBB-005: README documents Pyodide CDN requirement | pass |
| DBB-006: README provides offline/CSP workaround guidance | pass |

## Evidence

- `ask.ts:137` — `if (tools.includes('shell') && isNodeEnv()) defs.push(shellToolDef)` — shell excluded in browser
- `shell.ts:19-21` — `isNodeEnv()` checks for `process.versions?.node`
- `ask.ts:16` — `const filesystem = config.filesystem ?? new AgenticFileSystem({ storage: new MemoryStorage() })` — zero-config default
- `README.md:105-115` — Pyodide CDN requirement and workarounds documented
- `README.md:113-115` — self-hosting and disable Python workarounds
