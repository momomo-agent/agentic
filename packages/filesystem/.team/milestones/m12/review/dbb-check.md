# M12 DBB Check

**Match: 90%** | 2026-04-07T15:39:44.397Z

## Results

| ID | Criterion | Status |
|----|-----------|--------|
| DBB-001 | stat() on AgenticStoreBackend returns correct shape | pass |
| DBB-002 | stat() on OPFSBackend returns correct shape | pass |
| DBB-003 | createDefaultBackend() selects correct backend | pass |
| DBB-004 | ShellFS handles 'rm' command | pass |
| DBB-005 | ShellFS handles 'tree' command | pass |

## Evidence

- `agentic-store.ts:75-84` — stat() returns `{size, mtime, isDirectory: false}`, null for missing.
- `opfs.ts:96-104` — stat() returns `{size: file.size, mtime: file.lastModified, isDirectory: false}`.
- `index.ts:26-69` — createBackend() selects Node→OPFS→IDB→Memory.
- `shell.ts:16-17` — rm and tree cases in exec() switch.
