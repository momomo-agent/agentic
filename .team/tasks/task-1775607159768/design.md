# Technical Design: Update exec() Return Format in ARCHITECTURE.md

## Problem

ARCHITECTURE.md §Error Handling > Error Propagation states:
> "Exit codes: not currently implemented (all commands return strings)"

But `exec()` at `src/index.ts:73` actually returns `Promise<{ output: string; exitCode: number }>`. The spec is behind the implementation.

## Scope

This is a documentation-only change to align ARCHITECTURE.md with the actual implementation.

## File to Modify

- `ARCHITECTURE.md`

## Changes Required

### 1. Update "Error Propagation" section (line ~147)

Replace:
```
- Exit codes: not currently implemented (all commands return strings)
```

With:
```
- Exit codes: `exec()` returns `{ output: string; exitCode: number }`
  - Exit code 0: success (output may be empty or non-empty)
  - Exit code 1: error (grep no-match, command failure, syntax error)
  - Exit code derivation: `exitCodeFor(output)` helper inspects output for error patterns
```

### 2. Update "Pipe Support" section (line ~52-58)

Add exit code propagation note after existing pipe description:
```
**Exit code propagation**: In a pipeline, exit code comes from the last command.
If the left command fails (exitCode != 0), stdin is cleared to empty string for
the right command. The final exit code is determined by `exitCodeFor()` on the
final output.
```

### 3. Add exec() return type documentation

In the Overview or a new subsection near the top, document:
```typescript
async exec(command: string, depth?: number): Promise<{ output: string; exitCode: number }>
```

## Verification

- Read the updated ARCHITECTURE.md and confirm:
  - No references to "not currently implemented" for exit codes
  - exec() return type is documented as `{ output: string; exitCode: number }`
  - Pipe exit code behavior is documented
