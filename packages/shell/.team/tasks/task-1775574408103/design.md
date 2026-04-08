# Task Design: Glob Pattern Expansion in Command Args

## Scope
Extend glob expansion to `cat`, `rm`, `cp` commands. `ls` and `grep` already support it.

## File to Modify
- `src/index.ts`
- `src/index.test.ts`

## Implementation

### New helper method (add after `expandGlob` at line ~228)
```typescript
private async expandPathArgs(args: string[]): Promise<string[]> {
  const result: string[] = []
  for (const a of args) {
    if (a.startsWith('-') || !/[*?]/.test(a)) { result.push(a); continue }
    const matches = await this.expandGlob(a, this.cwd)
    if (matches.length) result.push(...matches)
    else result.push(a) // keep original so caller can emit no-match error
  }
  return result
}
```

### cat (line ~278)
```typescript
private async cat(args: string[]): Promise<string> {
  const expanded = await this.expandPathArgs(args)
  const paths = expanded.filter(a => !a.startsWith('-'))
  if (!paths.length) return 'cat: missing operand'
  const results = await Promise.all(paths.map(async p => {
    const r = await this.fs.read(this.resolve(p))
    return r.error ? this.fsError('cat', p, r.error) : (r.content ?? '')
  }))
  return results.join('\n')
}
```

### rm (line ~482) — expand before filtering paths
```typescript
private async rm(args: string[]): Promise<string> {
  const recursive = args.includes('-r') || args.includes('-rf')
  const expanded = await this.expandPathArgs(args)
  const paths = expanded.filter(a => !a.startsWith('-'))
  // ... rest unchanged
}
```

### cp (line ~551) — expand src only (dst is never a glob)
```typescript
private async cp(args: string[]): Promise<string> {
  const flags = args.filter(a => a.startsWith('-'))
  const pathArgs = args.filter(a => !a.startsWith('-'))
  const [src, dst] = pathArgs
  if (!src || !dst) return 'cp: missing operand'
  // Glob: if src is a glob, expand and copy each match to dst (must be dir)
  if (/[*?]/.test(src)) {
    const matches = await this.expandGlob(src, this.cwd)
    if (!matches.length) return `cp: ${src}: No such file or directory`
    for (const m of matches) {
      const name = m.split('/').pop()!
      const dstPath = this.resolve(dst) + '/' + name
      const r = await this.fs.read(m)
      if (r.error) return this.fsError('cp', m, r.error)
      await this.fs.write(dstPath, r.content ?? '')
    }
    return ''
  }
  // ... rest unchanged
}
```

## Edge Cases
- Glob with no matches: return `cp/cat/rm: <pattern>: No such file or directory`
- Non-glob args: unaffected
- Flags (starting with `-`) are never expanded

## Test Cases
```typescript
it('cat *.txt concatenates matching files')
it('cat *.xyz returns no such file or directory')
it('rm *.log removes all matching files')
it('cp *.md /dest/ copies each match')
```
