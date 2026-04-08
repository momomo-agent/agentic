# M10 DBB Check

**Match: 90%** | 2026-04-07T15:39:44.397Z

## Results

| ID | Criterion | Status |
|----|-----------|--------|
| DBB-001 | stat() returns isDirectory field | pass |
| DBB-002 | stat() returns null for missing paths | pass |
| DBB-003 | file_delete and file_tree in getToolDefinitions() | pass |
| DBB-004 | createAutoBackend() exported from index | pass |

## Evidence

- `agentic-store.ts:80` — returns `{size, mtime, isDirectory: false}`.
- `opfs.ts:100` — returns `{size, mtime, isDirectory: false}`.
- `filesystem.ts:311-330` — both tools present.
- `index.ts:72` — `createAutoBackend = createBackend` exported.
