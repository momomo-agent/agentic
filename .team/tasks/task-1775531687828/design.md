# Task Design: 标准化错误处理

## Files to Modify
- `src/index.ts` — error return strings across all commands

## UNIX Error Format

```
<command>: <path>: No such file or directory
```

## Audit & Fixes

### cat (line 69)
Current: `cat: ${p}: ${r.error}` — already close, but `r.error` may not say "No such file or directory"
Fix: normalize to `cat: ${p}: No such file or directory` when error indicates missing file.

### mv (line 134)
Current: `mv: ${src}: ${r.error}` — same issue
Fix: `mv: ${src}: No such file or directory`

### cp (line 143)
Current: `cp: ${src}: ${r.error}` — same
Fix: `cp: ${src}: No such file or directory`

### head / tail (lines 162, 170)
Current: `head: ${path}: ${r.error}` — normalize same way

### wc (line 181)
Current: `wc: ${path}: ${r.error}` — normalize

### mkdir
Current: no error returned on failure. Add try/catch:
```typescript
try {
  await this.fs.write(this.resolve(p) + '/.keep', '')
} catch (e) {
  return `mkdir: cannot create directory '${p}': No such file or directory`
}
```

### rm
Current: no error on missing path. Add:
```typescript
const r = await this.fs.read(this.resolve(p))
if (r.error) return `rm: cannot remove '${p}': No such file or directory`
await this.fs.delete(this.resolve(p))
```

## Helper

Add private helper to normalize error messages:
```typescript
private fsError(cmd: string, path: string, err: string): string {
  if (err?.toLowerCase().includes('not found') || err?.toLowerCase().includes('no such'))
    return `${cmd}: ${path}: No such file or directory`
  return `${cmd}: ${path}: ${err}`
}
```

## Test Cases (DBB-007, DBB-008, DBB-009)
- `cat /no/such/file` → `cat: /no/such/file: No such file or directory`
- `mkdir /no/parent/dir` → error with path
- `rm /nonexistent` → `rm: cannot remove '/nonexistent': No such file or directory`
