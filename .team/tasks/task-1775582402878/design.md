# Design: Background Jobs & Job Control

## Files to Modify
- `src/index.ts` — all changes here (single-file architecture)

## Data Structures

Add to `AgenticShell` class:

```typescript
private jobs: Map<number, { id: number; command: string; status: 'running' | 'stopped' | 'done'; promise: Promise<string> }> = new Map()
private nextJobId = 1
```

## Function Signatures

```typescript
// Detect & strip trailing & from command string
private isBackground(cmd: string): [boolean, string]
// Returns [true, "cmd without &"] or [false, original cmd]

// Built-in: list jobs
private async jobs_cmd(args: string[]): Promise<string>
// Output: "[1] running   cat foo.txt"

// Built-in: bring job to foreground (await its promise)
private async fg(args: string[]): Promise<string>
// args[0] = job id (e.g. "1" or "%1")

// Built-in: resume stopped job in background (no-op for async model)
private async bg(args: string[]): Promise<string>
```

## Logic Outline

### `exec()` — detect background

```typescript
async exec(cmd: string): Promise<string> {
  const [isBg, cleanCmd] = this.isBackground(cmd)
  if (isBg) {
    const id = this.nextJobId++
    const promise = this.execPipeline(cleanCmd).then(result => {
      this.jobs.get(id)!.status = 'done'
      return result
    })
    this.jobs.set(id, { id, command: cleanCmd, status: 'running', promise })
    return `[${id}] ${id}`  // UNIX-style: "[1] 1"
  }
  return this.execPipeline(cmd)
}
```

Rename current pipe-handling body of `exec()` to `execPipeline()`.

### `isBackground(cmd)`

```typescript
private isBackground(cmd: string): [boolean, string] {
  const trimmed = cmd.trimEnd()
  if (trimmed.endsWith('&')) return [true, trimmed.slice(0, -1).trimEnd()]
  return [false, cmd]
}
```

### `jobs_cmd()`

```typescript
private async jobs_cmd(args: string[]): Promise<string> {
  if (this.jobs.size === 0) return ''
  return [...this.jobs.values()]
    .map(j => `[${j.id}] ${j.status.padEnd(9)} ${j.command}`)
    .join('\n')
}
```

### `fg(args)`

```typescript
private async fg(args: string[]): Promise<string> {
  const id = parseInt((args[0] ?? '').replace('%', ''))
  if (isNaN(id) || !this.jobs.has(id)) return `fg: ${args[0] ?? ''}: no such job`
  const job = this.jobs.get(id)!
  const result = await job.promise
  this.jobs.delete(id)
  return result
}
```

### `bg(args)`

```typescript
private async bg(args: string[]): Promise<string> {
  const id = parseInt((args[0] ?? '').replace('%', ''))
  if (isNaN(id) || !this.jobs.has(id)) return `bg: ${args[0] ?? ''}: no such job`
  return ''  // already running async; no-op
}
```

### `execSingle()` — add cases

```typescript
case 'jobs': return this.jobs_cmd(args)
case 'fg':   return this.fg(args)
case 'bg':   return this.bg(args)
```

## Edge Cases & Error Handling

- `fg` with no args: use most recent job (highest id), or return `fg: current: no such job` if none
- `fg %0` or invalid id: `fg: %0: no such job`
- `jobs` with no jobs: return empty string (matches bash behavior)
- Background command that errors: status becomes `'done'`, error string stored in promise result
- `& ` with only whitespace before it: treat as background with empty command → return error `exec: missing command`
- Pipes with `&`: `cat foo | grep bar &` — entire pipeline runs in background; `isBackground` strips `&` before pipe splitting

## Dependencies

- No new imports needed
- `execPipeline()` is just a rename of the current `exec()` pipe logic

## Test Cases

```typescript
describe('background jobs', () => {
  it('returns job id for & command')
  it('exec returns immediately without waiting')
  it('jobs lists running jobs')
  it('fg awaits job and returns output')
  it('fg removes job from list after completion')
  it('fg with invalid id returns error')
  it('bg with valid id is no-op')
  it('bg with invalid id returns error')
  it('jobs returns empty string when no jobs')
  it('pipeline with trailing & runs in background')
})
```
