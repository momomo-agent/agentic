# M8 Technical Design — Command Completeness & Documentation

## Overview
This milestone completes the command set with recursive copy, directory move, dotfile handling, redirection operators, and adds comprehensive documentation. It also ensures explicit test coverage for pagination and streaming features.

## Architecture Alignment
All implementations follow the single-file architecture in `src/index.ts` with the command pattern:
```typescript
private async <command>(args: string[]): Promise<string>
```

## Component Designs

### 1. cp -r (Recursive Copy)
**Files**: `src/index.ts`

**Implementation approach**:
- Add `-r` flag detection in `cp()` method
- Implement recursive directory traversal helper: `copyRecursive(src: string, dst: string)`
- Use `fs.ls()` to enumerate directory contents
- For each entry:
  - If file: call `fs.read()` then `fs.write()`
  - If directory: recursively call `copyRecursive()`
- Handle cycle detection with visited set (path tracking)
- Maintain directory structure in destination

**Error handling**:
- Source doesn't exist: `cp: <src>: No such file or directory`
- Permission denied: check `fs.readOnly` before writes
- Deep nesting: use iterative approach or tail recursion to avoid stack overflow

**Edge cases**:
- Copying directory to itself (detect and error)
- Deeply nested directories (10+ levels)
- Empty directories (create with `.keep` file if needed)

### 2. echo with Redirection (>, >>)
**Files**: `src/index.ts`

**Implementation approach**:
- Parse command string in `exec()` before executing
- Detect `>` and `>>` operators by splitting on these tokens
- Extract: `<command> <operator> <filepath>`
- Execute command portion normally
- Apply redirection:
  - `>`: overwrite file with command output via `fs.write()`
  - `>>`: append to file (read existing, concatenate, write)
- Return success message or error

**Error handling**:
- Permission denied: check `fs.readOnly`
- Invalid syntax: `echo: syntax error near unexpected token`
- Missing filename: `echo: missing file operand`

**Edge cases**:
- File doesn't exist for `>>`: create new file (same as `>`)
- Empty output: create empty file for `>`, no-op for `>>`
- Multiple redirections in one command: only support rightmost

### 3. mv Directory Support
**Files**: `src/index.ts`

**Implementation approach**:
- Enhance `mv()` method to detect directory sources
- Use `fs.ls()` to check if source is directory
- For directory move:
  1. Copy recursively (reuse `copyRecursive()` from cp -r)
  2. Delete source recursively (reuse `deleteRecursive()` from rm -r)
- For destination that exists:
  - If directory: replace (delete dst, then copy src)
  - If file: error `mv: cannot overwrite non-directory with directory`

**Error handling**:
- Source doesn't exist: `mv: <src>: No such file or directory`
- Permission denied: check `fs.readOnly`
- Moving directory to its own subdirectory: detect and error

**Edge cases**:
- Moving `/` root: refuse with error
- Destination is subdirectory of source: detect cycle
- Empty directories

### 4. ls -a (Show Dotfiles)
**Files**: `src/index.ts`

**Implementation approach**:
- Add `-a` flag detection in `ls()` method
- Without `-a`: filter out entries starting with `.`
- With `-a`: include all entries plus synthetic `.` and `..`
- Synthetic entries:
  - `.` represents current directory
  - `..` represents parent directory (or `.` if at root)

**Error handling**:
- No special error cases beyond existing ls behavior

**Edge cases**:
- Root directory: `..` should point to `/` (same as `.`)
- Directory with only dotfiles: without `-a` shows empty, with `-a` shows all

### 5. Pagination Test Coverage
**Files**: `src/index.test.ts`

**Implementation approach**:
- Add dedicated test suite: `describe('pagination', () => { ... })`
- Test cases:
  - `ls --page 1 --page-size 5`: verify first 5 entries
  - `ls --page 2 --page-size 5`: verify next 5 entries
  - `ls --page 999`: verify empty result (out of bounds)
  - `ls --page-size 0`: verify error or all entries
- Use mock filesystem with known entry count (e.g., 20 files)

**Verification**:
- Test names include "pagination" or "page"
- Coverage for boundary cases (first page, last page, beyond last)

### 6. Streaming Test Coverage
**Files**: `src/index.test.ts`

**Implementation approach**:
- Add dedicated test suite: `describe('streaming', () => { ... })`
- Test cases:
  - `grepStream()` with matches: verify async iteration
  - `grepStream()` with no matches: verify empty iteration
  - `grepStream()` with large file: verify memory efficiency (mock large content)
- Mock `fs.readStream()` to return async iterable

**Verification**:
- Test names include "stream" or "streaming"
- Coverage for happy path, empty results, and large data

### 7. ARCHITECTURE.md Documentation
**Files**: `ARCHITECTURE.md` (already exists at repo root)

**Implementation approach**:
- File already exists and is comprehensive
- Verify it covers all required sections:
  - File system abstraction design ✓
  - Command execution architecture ✓
  - Pipe implementation approach ✓
  - Path resolution strategy ✓
  - Permission model ✓
- No changes needed unless gaps found during review

**Verification**:
- Manual review against DBB-m8-019 requirements
- Ensure "why" explanations exist for each design decision

## Dependencies
- All features depend on existing `AgenticFileSystem` interface
- `cp -r` and `mv` directory support share recursive traversal logic
- Redirection operators require command parsing before execution
- Test coverage additions are independent of implementation

## Testing Strategy
Each feature requires:
1. Happy path test
2. Error case test (non-existent source, permission denied)
3. Boundary case test (deep nesting, empty directories, edge inputs)

Pagination and streaming get dedicated test suites with explicit naming.

## Implementation Order
1. `cp -r` (enables directory operations)
2. `mv` directory support (reuses cp -r logic)
3. `ls -a` (simple flag addition)
4. `echo >` and `>>` (requires command parsing enhancement)
5. Pagination tests (verify existing functionality)
6. Streaming tests (verify existing functionality)
7. ARCHITECTURE.md review (documentation verification)
