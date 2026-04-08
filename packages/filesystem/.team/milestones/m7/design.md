# M7 Technical Design — Test Coverage Completeness & Runtime Auto-Selection

## Overview

Three work items:
1. Expand edge-case tests to OPFS, Memory, LocalStorage backends
2. Add `createDefaultBackend()` (alias/rename of existing `createBackend()`)
3. Fix README performance table and scan() example

## Architecture Notes

- `createBackend()` already exists in `src/index.ts` with correct auto-selection logic
- `createDefaultBackend()` is a named alias export — no logic duplication
- Edge-case tests extend `test/edge-cases.test.js` pattern using Node test runner
- OPFS cannot run in Node.js — skip with a mock or mark as browser-only
- README is a documentation-only change

## File Changes

| File | Change |
|------|--------|
| `src/index.ts` | Export `createDefaultBackend` as alias for `createBackend` |
| `test/edge-cases.test.ts` | Add Memory, LocalStorage backends; add empty-path, unicode, concurrent 10+ tests |
| `README.md` | Fix performance table columns; fix scan() example to include `line` field |

## Dependencies

- Tasks are independent; README fix has no code dependency
- `createDefaultBackend` must be exported before its test can pass
