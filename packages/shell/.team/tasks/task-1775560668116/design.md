# Design: ls -a 真实隐藏文件

## Files
- `src/index.ts` — modify `ls()` method (lines 112-142)
- `src/index.test.ts` — add tests

## Algorithm

Current code (line 125-129):
```typescript
if (all) {
  entries = [{ name: '.', type: 'dir' }, { name: '..', type: 'dir' }, ...entries]
} else {
  entries = entries.filter(e => !e.name.startsWith('.'))
}
```

Fix: `fs.ls()` already returns dotfiles — the `else` branch filters them out correctly, but the `if (all)` branch also needs to NOT filter them (currently it doesn't, so dotfiles from fs are preserved). The bug is that the spread `...entries` already includes real dotfiles from fs. This is actually correct — no change needed to include real dotfiles.

Re-reading: the issue is that `entries` from `fs.ls()` may or may not include dotfiles depending on the fs adapter. The task says "read real hidden files from fs adapter". The current code does pass through all entries when `all=true`. The fix is to ensure we don't double-add synthetic `.`/`..` if fs already returns them.

### Fix
```typescript
if (all) {
  const hasDot = entries.some(e => e.name === '.')
  const hasDotDot = entries.some(e => e.name === '..')
  const synthetic = []
  if (!hasDot) synthetic.push({ name: '.', type: 'dir' as const })
  if (!hasDotDot) synthetic.push({ name: '..', type: 'dir' as const })
  entries = [...synthetic, ...entries]
} else {
  entries = entries.filter(e => !e.name.startsWith('.'))
}
```

This ensures:
- Real dotfiles from fs are included when `-a` is set
- Synthetic `.` and `..` are added only if not already present
- Without `-a`, dotfiles are still filtered

## Edge Cases
- fs returns `.gitignore` → appears in `ls -a`, hidden in `ls`
- fs already returns `.` and `..` → no duplicates

## Test Cases
1. `ls -a` on dir with `.hidden` file → `.hidden` appears in output
2. `ls` on same dir → `.hidden` not in output
3. `ls -a` → `.` and `..` always present
