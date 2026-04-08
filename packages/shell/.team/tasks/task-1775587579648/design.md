# Technical Design — task-1775587579648: Implement environment variable substitution ($VAR)

## Goal
Complete the environment variable feature: add built-in variables, VAR=value assignment syntax, and ensure PWD stays in sync with cd. The existing substituteEnv() already handles $VAR and ${VAR} expansion — this task fills the remaining gaps.

## Problem
Current code (src/index.ts:14-24):
- env map and substituteEnv() exist but are empty by default
- No built-in variables (HOME, PWD, PATH)
- No way to set variables from shell commands (VAR=value syntax)
- PWD does not update when cd is called

## Files to Modify
1. `src/index.ts` — constructor (add built-ins), cd() (sync PWD), execPipeline() (VAR=value parsing)
2. `test/env-vars.test.ts` — new test file

## Source Code Changes

### 1. Constructor — Add Built-in Variables

**Location**: src/index.ts, constructor (~line 44)

Add after existing constructor body:
```typescript
// Initialize built-in environment variables
this.env.set('HOME', '/')
this.env.set('PWD', this.cwd)
this.env.set('PATH', '/usr/bin:/bin')
```

### 2. cd() — Sync PWD with cwd

**Location**: src/index.ts, cd() method (~line 560-568)

**After** the line `this.cwd = resolved` (line 567), add:
```typescript
this.env.set('PWD', resolved)
```

This ensures `$PWD` always reflects the current working directory.

### 3. execPipeline() — VAR=value Assignment Parsing

**Location**: src/index.ts, execPipeline() method (~line 73)

At the top of execPipeline() (after the empty check), add VAR=value detection BEFORE the existing pipeline logic:

```typescript
// Handle VAR=value assignment
const assignMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.+)$/)
if (assignMatch) {
  this.env.set(assignMatch[1], assignMatch[2])
  return { output: '', exitCode: 0 }
}
```

This handles: `MYVAR=hello` sets env MYVAR to "hello".

### 4. Optional: export command

If VAR=value assignment is handled in execPipeline, `export VAR=value` can be a simple passthrough:
```typescript
case 'export': {
  const expr = args.join(' ')
  const m = expr.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
  if (m) { this.env.set(m[1], m[2]); return '' }
  return 'export: not supported'
}
```

Add to execSingle() switch (~line 208).

### 5. getEnv() Public API

Add a public getter for external consumers:
```typescript
getEnv(key: string): string | undefined { return this.env.get(key) }
```

## Edge Cases
- `$` not followed by valid identifier char: leave as literal
- `VAR=` (empty value): set to empty string (valid)
- `=` in command arguments that aren't assignments: the regex `^([A-Za-z_][A-Za-z0-9_]*)=(.+)$` requires the first word to be an identifier, so `echo a=b` won't match (echo is the command, not a variable name)
- `$PWD` after cd must reflect new cwd — handled by cd() sync

## Test Cases (test/env-vars.test.ts)

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { AgenticShell } from '../src/index'
import { makeMockFs } from '../src/index.test' // or define locally

describe('environment variables', () => {
  let sh: AgenticShell

  beforeEach(() => {
    const fs = makeMockFs()
    sh = new AgenticShell(fs)
  })

  it('echo $HOME returns built-in HOME', async () => {
    const { output } = await sh.exec('echo $HOME')
    expect(output).toBe('/')
  })

  it('echo ${HOME}/src works with brackets', async () => {
    const { output } = await sh.exec('echo ${HOME}/src')
    expect(output).toBe('/src')
  })

  it('undefined variable expands to empty string', async () => {
    const { output } = await sh.exec('echo $UNDEFINED_VAR')
    expect(output).toBe('')
  })

  it('$PWD reflects cwd after cd', async () => {
    await sh.exec('cd /tmp')
    const { output } = await sh.exec('echo $PWD')
    expect(output).toBe('/tmp')
  })

  it('VAR=value assignment and retrieval', async () => {
    await sh.exec('MYVAR=hello')
    const { output } = await sh.exec('echo $MYVAR')
    expect(output).toBe('hello')
  })

  it('multiple variables in one command', async () => {
    await sh.exec('A=x')
    await sh.exec('B=y')
    const { output } = await sh.exec('echo $A $B')
    expect(output).toBe('x y')
  })

  it('variable substitution in pipe', async () => {
    await sh.exec('PAT=hello')
    const { output } = await sh.exec('echo hello world | grep $PAT')
    expect(output).toContain('hello world')
  })
})
```

## Dependencies
- None — this task is independent from glob and cp tasks
- Uses existing substituteEnv() mechanism

## Verification
- Run `npx vitest run test/env-vars.test.ts` — all 7 tests pass
- Run `npm test` — no regressions
- DBB criteria: DBB-m25-env-001 through DBB-m25-env-007 verified
