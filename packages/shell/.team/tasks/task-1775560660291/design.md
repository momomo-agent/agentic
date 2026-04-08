# Task Design: mv Directory Support

## Objective
Enable `mv` command to move directories, not just files.

## Files to Modify
- `src/index.ts` — modify `mv()` method (lines 359-369)

## Implementation

### 1. Detect if Source is Directory
```typescript
private async mv(args: string[]): Promise<string> {
  const [src, dst] = args.filter(a => !a.startsWith('-'))
  if (!src || !dst) return 'mv: missing operand'
  
  const srcPath = this.resolve(src)
  const dstPath = this.resolve(dst)
  const werr = this.checkWritable('mv', srcPath)
  if (werr) return werr

  // Check if source is a directory
  let isDir = false
  try {
    await this.fs.ls(srcPath)
    isDir = true
  } catch {
    // Not a directory, proceed as file
  }

  if (isDir) {
    // Move directory: copy then delete
    const copyErr = await this.copyRecursive(srcPath, dstPath)
    if (copyErr) return copyErr
    const delErr = await this.deleteRecursive(srcPath)
    if (delErr) return delErr
    return ''
  } else {
    // Existing file move logic
    const r = await this.fs.read(srcPath)
    if (r.error) return this.fsError('mv', src, r.error)
    await this.fs.write(dstPath, r.content ?? '')
    await this.fs.delete(srcPath)
    return ''
  }
}
```

### 2. Reuse Existing Helpers
- `copyRecursive(src, dst)` — from cp -r implementation (task-1775560668073)
- `deleteRecursive(path)` — already exists from rm -r implementation

## Function Signatures

```typescript
private async mv(args: string[]): Promise<string>
// Reuses:
private async copyRecursive(src: string, dst: string): Promise<string>
private async deleteRecursive(path: string): Promise<string>
```

## Algorithm
1. Parse src and dst from args
2. Check write permissions
3. Try `fs.ls(src)` to detect if directory
4. If directory: call `copyRecursive()` then `deleteRecursive()`
5. If file: use existing read/write/delete logic
6. Return empty string on success, error message on failure

## Edge Cases
- Source doesn't exist → return "No such file or directory"
- Source is root `/` → deleteRecursive should refuse (already handled)
- Destination already exists → overwrite (UNIX behavior)
- readOnly filesystem → checkWritable catches it

## Error Handling
- Use `fsError()` helper for consistent error format
- Return error strings, don't throw exceptions
- Format: `mv: <path>: <reason>`

## Dependencies
- Depends on task-1775560668073 (cp -r) for `copyRecursive()` helper
- Depends on existing `deleteRecursive()` from rm -r

## Test Cases
1. `mv /dir1 /dir2` — moves directory successfully
2. `mv /a/b /c/d` — moves nested directory
3. `mv /nonexistent /dst` — returns error
4. `mv /file.txt /dst.txt` — still works for files
5. `mv /dir /dst` on readOnly fs — returns Permission denied
