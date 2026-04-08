# m27 — Technical Design: Command Substitution & Remaining Vision Gaps

## Overview
Close remaining Vision match gaps: command substitution depth control, glob bracket negation, and mkdir fallback verification.

## Current State Analysis

### Already Implemented
1. **Command substitution** (`src/index.ts:26-42`): `substituteCommands()` exists — iteratively finds `$(...)`, executes inner command via `this.exec()`, replaces with output. Uses parenthesis depth tracking for nested parens.
2. **Glob bracket passthrough** (`src/index.ts:359-361`): `matchGlob()` already passes `[...]` through to regex. Basic `[abc]` and `[a-z]` work.
3. **mkdir fallback** (`src/index.ts:595-601`): `mkdirOne()` already falls back to `write(path + '/.keep', '')` when `fs.mkdir` is missing.

### Gaps to Close
1. **Command substitution depth limiting**: Current code has no explicit depth cap — `$(echo $(echo $(echo ...)))` could recurse indefinitely via `this.exec()` → `substituteCommands()` → `this.exec()`. Need a depth parameter.
2. **Backtick syntax**: Only `$(cmd)` supported, not `` `cmd` ``.
3. **Glob negation**: `[!abc]` should map to `[^abc]` regex. Currently `[!abc]` passes through as literal `[!abc]` which doesn't negate in regex.
4. **mkdir fallback verification**: Confirm the fallback works correctly and document behavior.

## Implementation Plan

### File: `src/index.ts`

#### Change 1: Add depth parameter to `substituteCommands`
```typescript
// Current signature:
private async substituteCommands(cmd: string): Promise<string>

// New signature:
private async substituteCommands(cmd: string, depth = 0, maxDepth = 3): Promise<string>
```
- At start of method: if `depth >= maxDepth`, return `cmd` unchanged (prevents infinite recursion)
- When recursing for nested `$()`, pass `depth + 1` to recursive call
- Also pass depth to `this.exec()` call to track across exec boundary

#### Change 2: Add backtick support to `substituteCommands`
After the `$(...)` while loop, add a second pass for backtick syntax:
```typescript
// Backtick substitution: `cmd`
while (true) {
  const start = result.indexOf('`')
  if (start === -1) break
  const end = result.indexOf('`', start + 1)
  if (end === -1) break
  const inner = result.slice(start + 1, end)
  const r = await this.exec(inner)
  result = result.slice(0, start) + (r.exitCode === 0 ? r.output.trim() : '') + result.slice(end + 1)
}
```

#### Change 3: Fix glob bracket negation in `matchGlob`
Current code at line 359-361:
```typescript
if (ch === '[') {
  const close = pattern.indexOf(']', i + 1)
  if (close !== -1) { re += pattern.slice(i, close + 1); i = close + 1; continue }
}
```

Change to handle `[!...]` → `[^...]`:
```typescript
if (ch === '[') {
  const close = pattern.indexOf(']', i + 1)
  if (close !== -1) {
    let bracket = pattern.slice(i, close + 1)
    if (bracket.length > 2 && bracket[1] === '!') {
      bracket = '[^' + bracket.slice(2)  // [!abc] → [^abc]
    }
    re += bracket
    i = close + 1
    continue
  }
}
```

#### Change 4: Wire depth through exec path
Add optional `depth` parameter to `exec()`:
```typescript
async exec(command: string, depth = 0): Promise<{ output: string; exitCode: number }> {
  const afterEnv = this.substituteEnv(command.trim())
  const substituted = await this.substituteCommands(afterEnv, depth)
  // ... rest unchanged
}
```

Update `substituteCommands` to pass depth when calling `this.exec()`:
```typescript
const r = await this.exec(inner, depth + 1)
```

## Edge Cases
- Empty `$()` → should expand to empty string
- `$()` with whitespace → `$( echo hi )` should trim and execute `echo hi`
- Nested backticks inside `$()` → handled by sequential passes
- `[!]` (only 2 chars) → treated as literal, not negation
- Unclosed backtick → treated as literal (no closing backtick found)

## Dependencies
- No new dependencies
- Depends on existing `this.exec()` for command execution

## Test Cases
Covered by task-1775588571054.
