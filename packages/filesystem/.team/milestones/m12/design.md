# M12 Technical Design — stat() Completeness, Agent Tool Parity & Auto Backend Selection

## Overview
Three tasks: verify/test stat() on AgenticStore+OPFS, verify createDefaultBackend() export, add rm/tree commands to ShellFS.exec().

## Tasks

### 1. stat() on AgenticStoreBackend and OPFSBackend (task-1775573019284)
Both backends already implement stat(). Task is to add test coverage confirming the contract.
- `test/backends/agentic-store-stat.test.ts` — unit tests for stat() on AgenticStoreBackend
- `test/backends/opfs-stat.test.ts` — browser-only tests for OPFSBackend.stat()

### 2. createDefaultBackend() auto-selection (task-1775573036378)
Already exported from `src/index.ts` as `createDefaultBackend` and `createAutoBackend`.
Task is to add test coverage for environment detection logic.
- `test/create-default-backend.test.ts` — mock process/navigator/indexedDB, assert correct backend returned

### 3. Add delete and tree to ShellFS (task-1775573036337)
`shell_delete` and `shell_tree` exist in `shellFsTools` but `ShellFS.exec()` only handles ls/cat/grep/find/pwd.
Add `rm` and `tree` cases to `ShellFS.exec()` in `src/shell.ts`.

## File Paths
- `src/shell.ts` — add rm and tree cases to exec()
- `test/backends/agentic-store-stat.test.ts` — new
- `test/backends/opfs-stat.test.ts` — new (browser-only)
- `test/create-default-backend.test.ts` — new
