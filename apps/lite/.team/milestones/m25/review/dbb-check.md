# DBB Check — M25

**Match: 100/100** | 2026-04-08T12:00:00Z

## Results

| Task | Criterion | Status |
|------|-----------|--------|
| 1775581632597 | ask() with file tools but no config.filesystem does NOT throw | pass |
| 1775581632597 | file_read and file_write work zero-config | pass |
| 1775581632597 | Existing tests pass | pass |
| 1775581637037 | executeShell() in browser returns descriptive error | pass |
| 1775581637037 | README documents shell_exec as Node.js-only | pass |
| 1775581637037 | All existing shell tests pass in Node | pass |
| 1775581761671 | executeSearch() with no apiKey returns graceful error | pass |
| 1775581761671 | No unhandled rejections from search tool | pass |
| 1775581761671 | All existing tests pass | pass |

## Evidence

- `ask.ts:16` — auto-creates `new AgenticFileSystem({ storage: new MemoryStorage() })` when no filesystem
- `shell.ts:30` — `return { command, output: '', error: 'shell_exec not available in browser', exitCode: 1 }`
- `README.md:119` — "shell_exec is Node.js-only. In browser environments it returns a descriptive error"
- `search.ts:39` — `return { text: 'Search requires an API key — set toolConfig.search.apiKey', sources: [] }` (no throw)
- `search.ts:58` — same graceful error for Serper provider
- `test/m25-default-filesystem.test.ts`, `test/m25-shell-browser-safety.test.ts`, `test/m25-search-graceful.test.ts` — all passing
- 107/107 tests passing
