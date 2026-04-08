# Task Design: ls -a Surface Real Dotfiles

## Files to Modify
- `src/index.ts`

## Implementation

### ls() changes
```typescript
private async ls(args: string[]): Promise<string> {
  const showAll = args.includes('-a')
  const paths = args.filter(a => !a.startsWith('-'))
  const target = this.resolve(paths[0] ?? '.')

  let entries = await this.fs.ls(target)

  if (!showAll) {
    entries = entries.filter(e => !e.name.startsWith('.'))
  } else {
    // prepend synthetic . and ..
    const parent = this.normalizePath(target + '/..')
    entries = [
      { name: '.', type: 'dir' },
      { name: '..', type: 'dir' },
      ...entries
    ]
  }

  // existing formatting/pagination logic...
}
```

## Edge Cases
- Root `/`: `..` resolves to `/` (same as `.`)
- Directory with only dotfiles: `ls` shows nothing, `ls -a` shows all
- Pagination with `-a`: synthetic `.` and `..` count toward page size

## Test Cases
1. `ls -a /dir` with `.hidden`, `.env`, `visible` → all four plus `.` and `..` in output
2. `ls /dir` with `.hidden` and `visible` → only `visible` shown
3. `ls -a /dir` with no dotfiles → only `.`, `..`, and regular files
