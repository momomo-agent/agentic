# Technical Design — m23: Test Failures & Spec Alignment

## Overview
Fix 8 test failures across 3 independent concerns: pipe error propagation logic, cp directory error message format, and wc flag output format.

## 1. Pipe Error Propagation Fix

**File**: `src/index.ts`
**Method**: `exec()` / `execWithStdin()` — pipe handling logic

### Problem
When a left command in a pipe fails, the current implementation either short-circuits or mishandles multi-line error output. Tests in `test/pipe-error-edge-cases.test.ts` expect:
- Only the first line of multi-line output is checked for error patterns
- Normal output that looks like error text flows through normally
- 3-stage pipes propagate empty stdin (not short-circuit)
- Whitespace-prefixed output is not treated as an error

### Implementation
In the pipe execution logic (where `|` segments are processed):
1. After executing the left command, check only the **first line** of output for error detection
2. Use a strict error pattern: output starts with `command:` (no leading whitespace) to identify errors
3. If an error is detected, pass empty string `''` as stdin to the next command (not short-circuit the whole pipe)
4. Continue through all remaining pipe stages with empty stdin

### Key Logic Change
```
// Current: may check entire output or short-circuit
// Fixed:   check only first line, continue pipe with empty stdin
const firstLine = output.split('\n')[0]
const isError = /^\w+: /.test(firstLine)  // strict: no leading whitespace
const stdin = isError ? '' : output
```

## 2. cp Directory Error Message Fix

**File**: `src/index.ts`
**Method**: `cp()` — line 695

### Problem
Current code returns:
```
`cp: ${src}: is a directory (use -r)`
```
Tests expect standard UNIX format without the hint:
```
cp: /mydir: is a directory
```

### Implementation
Change line 695 from:
```typescript
try { await this.fs.ls(this.resolve(src)); return `cp: ${src}: is a directory (use -r)` } catch { /* not a directory */ }
```
To:
```typescript
try { await this.fs.ls(this.resolve(src)); return `cp: ${src}: is a directory` } catch { /* not a directory */ }
```

Single character removal: delete ` (use -r)` suffix.

## 3. wc Flag Output Format Fix

**File**: `src/index.ts`
**Method**: `wc()` — lines 767-769

### Problem
Current code returns just the count for `-l`, `-w`, `-c` flags:
```typescript
if (flags.includes('-l')) return `${lines}`
if (flags.includes('-w')) return `${words}`
if (flags.includes('-c')) return `${chars}`
```
Tests expect `count\tfilename` format (matching UNIX wc behavior).

### Implementation
Change lines 767-769 to include filename:
```typescript
if (flags.includes('-l')) return `${lines}\t${path}`
if (flags.includes('-w')) return `${words}\t${path}`
if (flags.includes('-c')) return `${chars}\t${path}`
```

Note: the default (no flags) case at line 770 already includes filename — only the flag branches need fixing.

## Dependencies
All three fixes are independent and can be done in parallel. Each touches different lines in `src/index.ts`.

## Test Verification
Run `npm test` — expect 329/329 passing (current: 321/329, 8 failures across 3 files).
