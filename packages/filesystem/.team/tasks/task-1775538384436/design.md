# Design: Add Symlink Support to NodeFsBackend

## Files to Modify
- `src/backends/node-fs.ts` — update `walk()`, `get()`, `scan()`, `scanStream()`

## Changes to walk() (src/backends/node-fs.ts)

Replace `readdir` with `withFileTypes` + lstat-based symlink resolution:

```typescript
private async walk(dir: string, out: string[], visited = new Set<string>()): Promise<void> {
  if (!existsSync(dir)) return
  const entries = await readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isSymbolicLink()) {
      const target = await realpath(full).catch(() => null)
      if (!target) continue  // broken symlink — skip
      if (visited.has(target)) continue  // circular — skip
      visited.add(target)
      const s = await stat(target).catch(() => null)
      if (!s) continue
      if (s.isDirectory()) await this.walk(target, out, visited)
      else out.push(full)  // push original path, not resolved target
    } else if (e.isDirectory()) {
      await this.walk(full, out, visited)
    } else {
      out.push(full)
    }
  }
}
```

## Imports to Add
```typescript
import { realpath } from 'node:fs/promises'
```

## get() — No Change Needed
`readFile` already follows symlinks automatically.

## scan() / scanStream() — No Change Needed
Both delegate to `list()` which uses `walk()`, so symlink resolution is inherited.

## Edge Cases
| Scenario | Behavior |
|---|---|
| File symlink | Included in list, content readable |
| Directory symlink | Recursed into, files included |
| Broken symlink | Silently skipped |
| Circular symlink | Silently skipped (visited set) |
| Symlink to symlink | Resolved via `realpath` (handles chains) |

## Test Cases (test/symlinks.test.ts)
- File symlink: `list()` includes it, `get()` returns target content
- Dir symlink: `list()` includes files inside
- Broken symlink: `list()` excludes it, no error thrown
- Circular symlink: `list()` completes without infinite loop
- `scan()` matches content through symlinked files
