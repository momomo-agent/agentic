# Task Design — find -type 过滤修复

## Files to Modify
- `src/index.ts` — `find()` method (line 89)

## Current Bug
```ts
if (typeFilter === 'f') paths = paths.filter(p => !p.endsWith('/'))
if (typeFilter === 'd') paths = paths.filter(p => p.endsWith('/'))
```
Relies on trailing `/` heuristic — unreliable if backend doesn't append `/` to dir names.

## Fix
Filter on `entry.type` before mapping to names:

```ts
private async find(args: string[]): Promise<string> {
  const nameIdx = args.indexOf('-name')
  const typeIdx = args.indexOf('-type')
  const namePattern = nameIdx !== -1 ? args[nameIdx + 1] : undefined
  const typeFilter = typeIdx !== -1 ? args[typeIdx + 1] : undefined
  const basePath = args[0]?.startsWith('-') ? this.cwd : (args[0] || this.cwd)
  const entries = await this.fs.ls(this.resolve(basePath))
  let filtered = entries
  if (typeFilter === 'f') filtered = entries.filter(e => e.type === 'file')
  if (typeFilter === 'd') filtered = entries.filter(e => e.type === 'dir')
  let paths = filtered.map(e => e.name)
  if (namePattern) {
    const regex = new RegExp('^' + namePattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$')
    paths = paths.filter(p => regex.test(p.split('/').pop()?.replace(/\/$/, '') ?? ''))
  }
  return paths.join('\n')
}
```

## Key Change
- Filter `entries` (typed objects) before mapping to `paths` (strings)
- Use `e.type === 'file'` and `e.type === 'dir'` — matches `AgenticFileSystem` entry shape

## Edge Cases
- `find /dir` (no -type) → all entries returned
- `find /dir -type f` → only files
- `find /dir -type d` → only directories
- `-name` pattern still applied after type filter

## Dependencies
- `AgenticFileSystem.ls()` must return entries with `{ name: string, type: 'file' | 'dir' }` shape (confirmed from existing `ls` command usage at line 59)

## Test Cases
- Directory with 2 files + 1 subdir: `find /dir -type f` → 2 results
- `find /dir -type d` → 1 result
- `find /dir` → 3 results
- `find /dir -type f -name "*.ts"` → filtered by both type and name
