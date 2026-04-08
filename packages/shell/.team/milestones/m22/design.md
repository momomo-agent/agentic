# Technical Design — m22: Documentation Alignment & Vision Capture

## Overview
Three documentation deliverables: a new VISION.md product vision doc, an ARCHITECTURE.md update to close the spec-implementation gap, and a cross-environment testing strategy document.

## 1. Create VISION.md

**File**: `/Users/kenefe/LOCAL/momo-agent/projects/agentic-shell/VISION.md`

Structure:
```
# Agentic Shell — Product Vision

## What
UNIX-like shell command interface on top of AgenticFileSystem.

## Why
[Problem statement: developers need familiar shell commands in browser/Electron/Node environments]

## Target Users
- Browser-based app developers needing filesystem operations
- Electron app developers
- Node.js CLI tool authors
- AI agents needing structured filesystem interaction

## Key Use Cases
1. Embedded shell in web apps (in-memory/IndexedDB FS)
2. Cross-platform filesystem abstraction
3. AI agent filesystem interaction layer

## Competitive Positioning
vs traditional shells (bash/zsh): runs in browser, no OS dependency
vs browser FS APIs: familiar UNIX semantics, pipe support
vs other libraries: single-file architecture, AgenticFileSystem abstraction

## Success Metrics
[Product goals — coverage, adoption, command completeness]
```

No code, no implementation details. Pure product-level document.

## 2. Update ARCHITECTURE.md

**File**: `/Users/kenefe/LOCAL/momo-agent/projects/agentic-shell/ARCHITECTURE.md`

Changes needed in "Future Enhancements" section (lines 206-218):

### 2a. Exit Codes
The current ARCHITECTURE.md says (line 147): "Exit codes: not currently implemented (all commands return strings)". But `exec()` already returns `{ output: string; exitCode: number }`.

**Fix**: Update "Error Handling > Error Propagation" section to document the actual return type. Remove "Exit codes" from "Future Enhancements".

### 2b. Glob Patterns
Current "Future Enhancements" lists "Glob pattern support (*, ?, [])" but `matchGlob()`, `expandGlob()`, and `expandPathArgs()` already implement `*`, `?`, and `[...]`.

**Fix**: Add a "Glob Expansion" section under a new or existing heading. Document:
- `matchGlob(name: string, pattern: string): boolean` — converts glob to regex
- `expandGlob(pattern: string, dir: string): Promise<string[]>` — expands against directory
- `expandPathArgs(args: string[]): Promise<string[]>` — expands glob args in commands
- Remove from "Future Enhancements"

### 2c. Input/Output Redirection
Current "Future Enhancements" lists "Redirection (>, >>, <)" but `execPipeline()` handles all three.

**Fix**: Add a "Redirection" section documenting:
- Output redirection: `command > file` (overwrite), `command >> file` (append)
- Input redirection: `command < file`
- Combined: `command < input > output`
- Remove from "Future Enhancements"

### 2d. Environment Variables & Command Substitution
If `$VAR`/`${VAR}` substitution and `$(cmd)` command substitution are implemented (confirmed in source), move these from "Future Enhancements" to documented sections.

### Editing approach
- Add new subsections rather than rewriting existing ones
- Preserve all existing content that is still accurate
- Update the specific lines that are factually incorrect (line 147 about exit codes)

## 3. Cross-Environment Testing Strategy

**File**: `/Users/kenefe/LOCAL/momo-agent/projects/agentic-shell/CROSS_ENV_TESTING.md`

Structure:
```
# Cross-Environment Testing Strategy

## Test Matrix
| Feature | Node.js | Browser | Electron |
|---------|---------|---------|----------|
| All commands | native FS | in-memory FS | native FS |
| Streaming grep | native FS | readStream mock | native FS |
| Pagination | native FS | in-memory FS | native FS |

## Mock Strategies
- Node.js: native `AgenticFileSystem` implementation
- Browser: in-memory FS (Map-based), optionally IndexedDB
- Electron: native FS via Electron APIs

## CI Integration
[Plan for running tests across environments]
```

Also covers DBB-env-001/002/003 requirements from EXPECTED_DBB.md.

## Dependencies
- None — all three tasks are documentation-only
- Tasks can be done in parallel (no cross-dependencies)
- Must be done AFTER m17-m21 implementation is finalized (blocker: "documentation should align with final implementation state")
