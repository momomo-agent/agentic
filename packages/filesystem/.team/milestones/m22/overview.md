# Milestone m22: Backend Error Consistency, OPFS Hardening & Cross-Backend Tests

## Goal
Close the remaining PRD and architecture gaps to push PRD match toward 90%.

## Target Gaps
- **PRD §3**: "backends silently swallow errors without typed throws" (partial → implemented)
- **PRD §4**: "Cross-backend consistency tests — not found" (missing → implemented)
- **PRD §4**: "Per-backend test suites — no test files found in src/" (partially addressed by m21)
- **ARCH**: "OPFSBackend missing empty-path validation" (missing → implemented)
- **ARCH**: "OPFSBackend.stat() always returns isDirectory: false" (partial → implemented)
- **ARCH**: "OPFSBackend.delete() throws if path not found" (partial → implemented)

## Scope
5 tasks targeting backend consistency and test coverage:

1. **Add cross-backend consistency test suite** — PRD §4 + ARCH gap
2. **Add OPFSBackend empty-path validation** — ARCH gap (missing)
3. **Normalize error handling: backends throw typed errors instead of silently swallowing** — PRD §3 gap
4. **Fix OPFSBackend stat() directory detection** — ARCH gap (partial)
5. **Fix OPFSBackend delete() error handling to match other backends** — ARCH gap (partial)

## Acceptance Criteria
- Cross-backend test suite passes on all 6 backends with identical behavior
- OPFSBackend validates empty paths like AgenticStoreBackend/NodeFsBackend
- All backends throw NotFoundError/PermissionDeniedError/IOError consistently (no silent catches)
- OPFSBackend.stat() correctly detects directories
- OPFSBackend.delete() returns false on missing path (no throw)
