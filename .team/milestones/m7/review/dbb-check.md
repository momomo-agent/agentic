# M7 DBB Check

**Match: 85%** | 2026-04-07T15:39:44.397Z

## Results

| ID | Criterion | Status |
|----|-----------|--------|
| DBB-001 | Edge-case tests cover all 5 backends | fail |
| DBB-002 | Concurrent write test uses 10+ files | fail |
| DBB-003 | Empty path rejected on all backends | pass |
| DBB-004 | createDefaultBackend() selects NodeFs in Node.js | pass |
| DBB-005 | createDefaultBackend() selects OPFS in browser | pass |
| DBB-006 | createDefaultBackend() falls back to Memory | pass |
| DBB-007 | README performance table has all required columns | pass |
| DBB-008 | README scan() example uses line field | pass |

## Evidence

- No tests/ directory — edge-case and concurrent tests absent.
- `index.ts:26-69` — createBackend() checks Node.js → OPFS → IndexedDB → Memory.
- README lines 32-56: table has Read(small), Write(small), Read(large), Storage Limit, Browser Support, Best For columns.
- README scan() examples show `{path, line, content}` shape.
