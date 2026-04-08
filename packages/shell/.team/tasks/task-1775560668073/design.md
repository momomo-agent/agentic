# Task Design: cp -r Recursive Directory Copy

## Objective
Implement `cp -r` flag to recursively copy directory trees.

## Files to Modify
- `src/index.ts` — modify `cp()` method (lines 371-380) and add `copyRecursive()` helper

## Implementation

### 1. Modify cp() to Detect -r Flag
```typescript
private async cp(args: string[]): Promise<string> {
  const flags = args.filter(a => a.startsWith('-'))
  const recursive = flags.includes('-r') || flags.includes('-R')
  const [src, dst] = args.filter(a => !a.startsWith('-'))
  
  if (!src || !dst) return 'cp: missing operand'
  
  const werr = this.checkWritable('cp', this.resolve(dst))
  if (werr) return werr

  if (recursive) {
    return this.copyRecursive(this.resolve(src), this.resolve(dst))
  }

  // Existing file copy logic
  const r = await this.fs.read(this.resolve(src))
  if (r.error) return this.fsError('cp', src, r.error)
  await this.fs.write(this.resolve(dst), r.content ?? '')
  return ''
}
```

### 2. Add copyRecursive() Helper
```typescript
private async copyRecursive(src: string, dst: string): Promise<string> {
  // Check if source exists and is a directory
  let entries: Array<{name: string; type: 'file' | 'dir'}>
  try {
    entries = await this.fs.ls(src)
  } catch (err) {
    return this.fsError('cp', src, String(err))
  }

  // Create destination directory
  if (this.fs.mkdir) {
    try {
      await this.fs.mkdir(dst)
    } catch {
      // Directory might already exist, continue
    }
  }

  // Copy each entry
  for (const entry of entries) {
    const srcPath = src + '/' + entry.name
    const dstPath = dst + '/' + entry.name
    
    if (entry.type === 'dir') {
      // Recurse into subdirectory
      const err = await this.copyRecursive(srcPath, dstPath)
      if (err) return err
    } else {
      // Copy file
      const r = await this.fs.read(srcPath)
      if (r.error) return this.fsError('cp', srcPath, r.error)
      await this.fs.write(dstPath, r.content ?? '')
    }
  }
  
  return ''
}
```

## Function Signatures

```typescript
private async cp(args: string[]): Promise<string>
private async copyRecursive(src: string, dst: string): Promise<string>
```

## Algorithm
1. Parse flags and paths from args
2. If `-r` flag present, call `copyRecursive()`
3. In `copyRecursive()`:
   - List source directory entries
   - Create destination directory
   - For each entry:
     - If directory: recurse
     - If file: read and write content
4. Return empty string on success, error message on failure

## Edge Cases
- Source doesn't exist → return "No such file or directory"
- Source is a file with -r flag → still copy (UNIX behavior)
- Destination already exists → overwrite contents
- Deep nesting (3+ levels) → handle via recursion
- Empty directory → create empty destination directory
- readOnly filesystem → checkWritable catches it

## Error Handling
- Use `fsError()` helper for consistent error format
- Return error strings, don't throw exceptions
- Format: `cp: <path>: <reason>`
- Propagate errors from recursive calls

## Dependencies
- Uses `fs.ls()`, `fs.read()`, `fs.write()`, `fs.mkdir()`
- No dependencies on other tasks

## Test Cases
1. `cp -r /dir1 /dir2` — copies directory tree
2. `cp -r /a/b /c/d` — copies nested directory
3. `cp -r /nonexistent /dst` — returns error
4. `cp /file.txt /dst.txt` — still works without -r
5. `cp -r /deep/nested/dir /dst` — handles 3+ levels
6. `cp -r /empty /dst` — copies empty directory
