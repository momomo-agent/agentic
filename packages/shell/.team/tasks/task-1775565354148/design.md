# Task Design: cp -r Recursive Directory Copy

## Files to Modify
- `src/index.ts`

## Implementation

### Helper: copyRecursive
```typescript
private async copyRecursive(src: string, dst: string): Promise<void> {
  const entries = await this.fs.ls(src)
  for (const entry of entries) {
    const srcPath = `${src}/${entry.name}`
    const dstPath = `${dst}/${entry.name}`
    if (entry.type === 'file') {
      const r = await this.fs.read(srcPath)
      if (r.error) throw new Error(r.error)
      await this.fs.write(dstPath, r.content ?? '')
    } else {
      await this.copyRecursive(srcPath, dstPath)
    }
  }
}
```

### cp() changes
```typescript
private async cp(args: string[]): Promise<string> {
  const recursive = args.includes('-r') || args.includes('-R')
  const paths = args.filter(a => !a.startsWith('-'))
  if (paths.length < 2) return 'cp: missing operand'
  const [src, dst] = [this.resolve(paths[0]), this.resolve(paths[1])]
  if (this.fs.readOnly) return this.permError('cp', src)

  // detect if src is directory
  let isDir = false
  try { await this.fs.ls(src); isDir = true } catch {}

  if (isDir && !recursive) return `cp: ${src}: omitting directory`
  if (isDir) {
    await this.copyRecursive(src, dst)
    return ''
  }
  // existing file copy logic...
}
```

## Edge Cases
- Non-existent source: `fs.ls(src)` throws → return `cp: <src>: No such file or directory`
- readOnly: check before any write
- Copying dir to itself: `dst.startsWith(src + '/')` → return error

## Test Cases
1. `cp -r /src /dst` copies full tree, `/src` unchanged
2. `cp /srcdir /dst` (no -r) → `cp: /srcdir: omitting directory`
3. `cp -r /nonexistent /dst` → `cp: /nonexistent: No such file or directory`
4. `cp -r /src /dst` on readOnly fs → Permission denied
