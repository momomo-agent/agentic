# Design: Add delete and tree agent tool definitions

## Status
`shell_delete` and `shell_tree` already exist in `shellFsTools` (src/shell-tools.ts).
Gap: `ShellFS.exec()` in `src/shell.ts` does not handle `rm` or `tree` commands.

## File to Modify
- `src/shell.ts` — add `rm` and `tree` cases to `exec()` switch

## Function Signatures
```ts
// In ShellFS class:
private async rm(path: string): Promise<string>
private async tree(path?: string): Promise<string>
```

## Algorithm

### rm(path)
```ts
if (!path) return 'rm: missing operand'
await this.fs.delete(path)
return ''
```

### tree(path)
```ts
const entries = await this.fs.ls(path ?? '/')
// Build indented tree string from TreeNode[] returned by fs.ls()
// Each entry: '  '.repeat(depth) + (type==='dir' ? '📁' : '') + name
return formatted string
```

### exec() additions
```ts
case 'rm':   return this.rm(args[0])
case 'tree': return this.tree(args[0])
```

## Edge Cases
- `rm` with no path → return error string
- `rm` on missing file → no-op (delete is already no-op)
- `tree` with no path → default to '/'
- Empty directory → return path with no children

## Test Cases
- exec('rm /foo.txt') deletes file, returns ''
- exec('rm') returns 'rm: missing operand'
- exec('tree /') returns string containing file names
- exec('tree') defaults to root

## Dependencies
- `AgenticFileSystem.delete(path)` and `AgenticFileSystem.ls(path)` — already exist
