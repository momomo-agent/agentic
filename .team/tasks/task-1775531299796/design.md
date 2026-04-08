# Task Design: 增强 grep 命令

## Files to Modify
- `src/index.ts` — `grep()` method (lines 74–87)

## Changes

### Add `-r` recursive flag support

Current `grep()` calls `this.fs.grep(pattern)` which already searches all files globally. The `-r` flag just needs to scope results to the given directory path.

```typescript
private async grep(args: string[]): Promise<string> {
  const flags = args.filter(a => a.startsWith('-'))
  const rest = args.filter(a => !a.startsWith('-'))
  const [pattern, ...paths] = rest
  if (!pattern) return 'grep: missing pattern'

  const recursive = flags.includes('-r') || flags.includes('-R')
  const results = await this.fs.grep(pattern)

  const filtered = paths.length
    ? results.filter(r => paths.some(p => r.path.startsWith(this.resolve(p))))
    : results

  if (flags.includes('-l')) return [...new Set(filtered.map(r => r.path))].join('\n')
  if (flags.includes('-c')) return String(filtered.length)
  if (!filtered.length) return ''  // exit code 1 semantics — empty output
  return filtered.map(r => `${r.path}:${r.line}: ${r.content}`).join('\n')
}
```

Note: `-r` with no path defaults to cwd. Add `paths = [this.cwd]` when `recursive && !paths.length`.

## Edge Cases
- `grep -r pattern /nonexistent` — `fs.grep()` returns empty; filter yields empty → return `''` (caller sees no match)
- No match → return `''` (UNIX exit code 1 semantics, but since we return string, empty string signals no match)
- `-l` + `-r` combined → deduplicated file list

## Test Cases (DBB-001, DBB-002, DBB-003)
- `grep -r pattern /dir` with nested matches → all matching lines returned
- `grep -r pattern /dir` with no matches → empty string
- `grep -r pattern /nonexistent` → empty string (no crash)
