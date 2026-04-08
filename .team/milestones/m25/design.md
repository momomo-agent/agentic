# Technical Design — m25: PRD Feature Gaps: Env Vars, Glob & cp Fix

## Overview
Close the remaining PRD compliance gaps by implementing environment variable substitution, extending glob to support recursive patterns and bracket expressions, and fixing cp error message format. Three tasks, partially independent.

## Architecture Context
- Single-file architecture: all logic in src/index.ts
- Tests in src/index.test.ts and test/*.test.ts using Vitest
- Mock pattern: makeMockFs() factory with vi.fn() overrides
- Shell class: AgenticShell with private command methods

## Current Code State

### Environment Variables (src/index.ts:14-24)
- env: Map<string, string> already exists as instance variable
- setEnv(key, value) public method exists
- substituteEnv(cmd) already handles $VAR and ${VAR} substitution
- Gap: No built-in vars (HOME, PATH, PWD), no VAR=value assignment parsing

### Glob Expansion (src/index.ts:336-370)
- matchGlob() handles *, ?, and [abc] bracket expressions
- expandGlob() only expands within a single directory (no recursive traversal)
- expandPathArgs() applies glob to command arguments
- Gap: ** recursive patterns not supported

### cp Error (src/index.ts:722)
- Current: return `cp: ${src}: is a directory`
- Expected: cp: -r not specified; omitting directory <path> (UNIX convention)
- Gap: Error message format mismatch

## Task Summary

### 1. Environment Variable Substitution (task-1775587579648)
Complexity: Medium — needs new parsing logic for VAR=value
Files: src/index.ts, test/env-vars.test.ts (new)
Key changes:
- Add built-in vars to env map in constructor: HOME, PWD (sync with cwd), PATH
- Add VAR=value detection in exec() or execPipeline() — split on first =, set env var
- Update cd() to sync PWD with new cwd
- Tests: 7+ test cases per DBB-m25-env criteria

### 2. Recursive Glob + Bracket Expressions (task-1775587579782)
Complexity: High — requires recursive directory traversal for **
Files: src/index.ts, test/glob-recursive.test.ts (new)
Key changes:
- Extend expandGlob() to detect ** in pattern
- New helper expandRecursiveGlob(baseDir, pattern) that:
  - Splits pattern at **
  - Recursively traverses all subdirectories from baseDir
  - Applies remaining pattern to each directory level
- Update expandPathArgs() to pass through ** patterns
- Tests: 6+ test cases per DBB-m25-glob criteria

### 3. cp Error Message Fix (task-1775587579874)
Complexity: Low — single line change + test update
Files: src/index.ts, existing test files
Key changes:
- Change line 722 error message from "is a directory" to "-r not specified; omitting directory '${src}'"
- Update or add test assertion
- Tests: 3 test cases per DBB-m25-cp criteria

## Dependencies
- Task 3 (cp fix) is independent — can be done first
- Task 1 (env vars) is independent from task 2 (glob)
- m24 should complete first for stable test baseline

## Verification
- Run npm test — all existing + new tests pass
- Each DBB criterion (DBB-m25-env-*, DBB-m25-glob-*, DBB-m25-cp-*) maps to test assertions
- No regressions in existing command behavior
