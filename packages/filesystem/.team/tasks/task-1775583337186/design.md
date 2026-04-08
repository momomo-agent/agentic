# Design: Fix AgenticStoreBackend.stat() mtime accuracy

## File to modify
- `src/backends/agentic-store.ts`

## Approach

Store mtime alongside content using a meta key `path + '\x00mtime'`.

**set()** — write mtime at write time:
```ts
async set(path: string, content: string): Promise<void> {
  this.validatePath(path)
  const p = this.normPath(path)
  try {
    await this.store.set(p, content)
    await this.store.set(p + '\x00mtime', String(Date.now()))
  } catch (e) { throw new IOError(String(e)) }
}
```

**stat()** — read stored mtime:
```ts
async stat(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean } | null> {
  this.validatePath(path)
  try {
    const value = await this.store.get(this.normPath(path))
    if (value == null) return null
    const mtimeRaw = await this.store.get(this.normPath(path) + '\x00mtime')
    const mtime = mtimeRaw ? Number(mtimeRaw) : 0
    return { size: new Blob([String(value)]).size, mtime, isDirectory: false }
  } catch { return null }
}
```

**delete()** — clean up meta key:
```ts
async delete(path: string): Promise<void> {
  this.validatePath(path)
  const p = this.normPath(path)
  try {
    await this.store.delete(p)
    await this.store.delete(p + '\x00mtime')
  } catch (e) { throw new IOError(String(e)) }
}
```

## Edge cases
- File written before this change has no mtime key → return `mtime: 0` (graceful fallback)
- Two stat() calls on unchanged file return same mtime
- Overwrite via set() updates mtime

## Test cases
- set('/f', 'x') then stat('/f').mtime === recorded timestamp (not Date.now() at stat time)
- Two stat() calls return same mtime
- set('/f', 'y') updates mtime
- delete('/f') removes mtime key (no orphan keys)
