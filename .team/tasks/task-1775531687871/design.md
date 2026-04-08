# Task Design: ls -a 隐藏文件支持

## Files to Modify
- `src/index.ts` — `ls()` method (lines 52–62)

## Current State

`all` variable is computed (line 54) but never used to filter entries.

## Fix

```typescript
private async ls(args: string[]): Promise<string> {
  const long = args.includes('-l') || args.includes('-la') || args.includes('-al')
  const all = args.includes('-a') || args.includes('-la') || args.includes('-al')
  const path = args.find(a => !a.startsWith('-')) || this.cwd
  let entries = await this.fs.ls(this.resolve(path))

  if (all) {
    // Prepend . and .. synthetic entries
    const dotEntries = [
      { name: '.', type: 'dir' as const },
      { name: '..', type: 'dir' as const },
    ]
    entries = [...dotEntries, ...entries]
  } else {
    // Filter out hidden files (names starting with '.')
    entries = entries.filter(e => !e.name.startsWith('.'))
  }

  if (!entries.length) return ''
  if (long) {
    return entries.map(e => `${e.type === 'dir' ? 'd' : '-'}rwxr-xr-x  ${e.name}`).join('\n')
  }
  return entries.map(e => e.type === 'dir' ? e.name + '/' : e.name).join('\n')
}
```

## Edge Cases
- `ls` (no -a): `.hidden` file not shown, `.keep` files not shown
- `ls -a`: `.hidden` shown, `.` and `..` prepended
- `ls -la`: long format with hidden files and . / ..
- Empty directory with -a: only `.` and `..` returned

## Test Cases (DBB-010, DBB-011)
- Directory with `.hidden` and `visible`: `ls` → only `visible`; `ls -a` → `.`, `..`, `.hidden`, `visible`
- `ls -a` on any dir → includes `.` and `..`
