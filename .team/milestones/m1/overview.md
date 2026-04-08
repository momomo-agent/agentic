# M1: API Consistency & Test Foundation

## Goals
Fix critical API inconsistencies across backends and establish test coverage.

## Scope
- Fix scan() return type: all backends must return `{path, line, content}[]`
- Fix list() path normalization: all backends must return paths with `/` prefix
- Implement typed errors: NotFound / PermissionDenied / IOError classes
- Fix OPFS error handling: replace silent catch blocks with proper error logging
- Add complete test suite: per-backend unit tests + cross-backend consistency tests
- Update README with backend configuration examples and performance comparison

## Acceptance Criteria
- `scan()` returns `{path: string, line: number, content: string}[]` on all 3 backends
- `list()` returns paths with leading `/` on all 3 backends
- Typed error classes thrown (not generic strings) for NotFound, PermissionDenied, IOError
- OPFS walkDir errors are logged and propagated (no silent failures)
- Test suite covers get/set/delete/list/scan for each backend
- Cross-backend consistency tests pass
- README includes backend-specific configuration examples and performance comparison table

## Tasks
- task-1775531683476: Fix scan() return type inconsistency (P0)
- task-1775531687208: Implement typed error classes (P0)
- task-1775531289546: Unify list() path format (P1)
- task-1775531865819: Fix OPFS walkDir error handling (P1)
- task-1775531289579: Add complete test suite (P1, blocked by scan() fix)
- task-1775531289613: README examples and performance comparison (P1)
