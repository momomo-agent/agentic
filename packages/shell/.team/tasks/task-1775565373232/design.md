# Task Design: mv Directory Support

## Files to Modify
- `src/index.ts`

## Implementation

### mv() changes
```typescript
private async mv(args: string[]): Promise<string> {
  const paths = args.filter(a => !a.startsWith('-'))
  if (paths.length < 2) return 'mv: missing operand'
  const [src, dst] = [this.resolve(paths[0]), this.resolve(paths[1])]
  if (this.fs.readOnly) return this.permError('mv', src)

  // Try file move first
  const r = await this.fs.read(src)
  if (!r.error) {
    // existing file move logic
    await this.fs.write(dst, r.content ?? '')
    await this.fs.delete(src)
    return ''
  }

  // Try directory move
  let isDir = false
  try { await this.fs.ls(src); isDir = true } catch {}
  if (!isDir) return `mv: ${src}: No such file or directory`

  // Check dst is not inside src
  if (dst.startsWith(src + '/')) return `mv: cannot move '${src}' to a subdirectory of itself`

  await this.copyRecursive(src, dst)
  await this.deleteRecursive(src)
  return ''
}
```

Depends on `copyRecursive()` (from cp -r task) and existing `deleteRecursive()`.

## Edge Cases
- Non-existent source: return `mv: <src>: No such file or directory`
- Moving dir into its own subtree: detect and error
- readOnly: check before any write/delete
- Destination exists as directory: overwrite (delete dst first, then copy)

## Test Cases
1. `mv /srcdir /dstdir` → `/dstdir` has all contents, `/srcdir` gone
2. `mv /nonexistent /dst` → `mv: /nonexistent: No such file or directory`
3. `mv /srcdir /srcdir/sub` → error (moving into subdirectory of itself)
4. `mv /srcdir /dst` on readOnly → Permission denied
