# Design: Fix mkdir .keep fallback

## File to modify
- `src/index.ts`

## Change
In `mkdirOne()` (line 444), replace the `throw` with a `.keep` file write when `fs.mkdir` is unavailable.

### Current (line 444-450)
```typescript
private async mkdirOne(resolved: string): Promise<void> {
  if (typeof (this.fs as any).mkdir === 'function') {
    await (this.fs as any).mkdir(resolved)
  } else {
    throw new Error('not supported by this filesystem')
  }
}
```

### New
```typescript
private async mkdirOne(resolved: string): Promise<void> {
  if (typeof (this.fs as any).mkdir === 'function') {
    await (this.fs as any).mkdir(resolved)
  } else {
    await this.fs.write(resolved + '/.keep', '')
  }
}
```

## Cascading changes
- Remove the `'not supported by this filesystem'` error string checks in `mkdir()` (lines 465, 473-475) — they become dead code once `mkdirOne` no longer throws that message.

## Test cases
- `mkdir /newdir` (no native mkdir) → writes `/newdir/.keep` with empty content, returns `''`
- `mkdir -p /a/b/c` (no native mkdir) → writes `.keep` at `/a/.keep`, `/a/b/.keep`, `/a/b/c/.keep`
- `mkdir /newdir` (native mkdir available) → calls `fs.mkdir('/newdir')`, no `.keep` written
- `mkdir /a/b` (parent `/a` missing, no -p) → returns `"mkdir: cannot create directory '/a/b': No such file or directory"`
- readOnly fs → returns `"mkdir: /newdir: Permission denied"`

## Edge cases
- `-p` with existing intermediate dirs: `mkdirOne` may throw from native mkdir (already exists) — existing try/catch in `mkdir()` swallows it, which is correct
- `.keep` write on readOnly fs: `checkWritable` is called before `mkdirOne`, so permission error is returned first
