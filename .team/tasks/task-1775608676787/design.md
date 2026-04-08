# Task Design: Create ARCHITECTURE.md documenting system design

## Status: Already Exists — Gap Check Only

`ARCHITECTURE.md` already exists at project root and covers the core system design. This task should verify it covers all 5 required sections and fill any gaps.

## Required Sections (from task description)

### 1. StorageBackend interface contract and design decisions
**Status: COVERED** — Lines 8-23 of ARCHITECTURE.md show the full interface with all methods. JSDoc comments explain design decisions (all paths absolute, stat() optional).

### 2. Backend selection flow (createBackend auto-detection chain)
**Status: COVERED** — Lines 64-73 document the 4-step auto-selection: Node.js → OPFS → IndexedDB → Memory fallback.

### 3. AgenticFileSystem class architecture (readOnly mode, permissions, tool definitions)
**Status: COVERED** — Lines 47-62 document the Agent Tool Layer including `getToolDefinitions()` and `executeTool()`. `ShellFS` is referenced.

### 4. Error type hierarchy (NotFoundError/PermissionDeniedError/IOError)
**Status: PARTIALLY COVERED** — The ARCHITECTURE.md does not explicitly document the error types from `src/errors.ts`. This section should be added.

### 5. Cross-backend consistency guarantees
**Status: PARTIALLY COVERED** — Not explicitly documented as a section. Consistency is implied but not formalized.

## Implementation Plan

### File: `ARCHITECTURE.md` (append two new sections)

**Add Error Type Hierarchy section** after the Agent Tool Layer section:
```markdown
## Error Types

Defined in `src/errors.ts`. All backends use these for consistent error handling:

| Error | When thrown |
|-------|------------|
| `NotFoundError` | `stat()` on missing path, `get()` returns null instead |
| `PermissionDeniedError` | `readOnly` mode write attempt, path permission denied |
| `IOError` | All other I/O failures (wraps backend-specific errors) |

All errors extend `Error` with a `name` property for `instanceof` checks.
```

**Add Cross-Backend Consistency section**:
```markdown
## Cross-Backend Consistency

All backends guarantee:
- **Paths**: Always absolute, starting with `/`. Backends normalize internally.
- **get()**: Returns `null` for missing paths (never throws NotFoundError)
- **set()**: Creates parent directories automatically (NodeFs, OPFS)
- **delete()**: No-op for missing paths (never throws)
- **list()**: Returns absolute paths with `/` prefix
- **stat()**: Returns `{ size, mtime, isDirectory, permissions }` or throws `NotFoundError`
- **Error types**: `NotFoundError`, `PermissionDeniedError`, `IOError` — never raw backend errors
```

## Verification
1. Read ARCHITECTURE.md and confirm all 5 sections are present
2. Verify error types in ARCHITECTURE.md match `src/errors.ts`
3. Verify consistency guarantees match actual backend behavior
