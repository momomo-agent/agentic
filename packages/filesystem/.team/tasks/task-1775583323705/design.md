# Design: Throw IOError on raw I/O failures in all backends

## Files to modify
- `src/backends/node-fs.ts`
- `src/backends/opfs.ts`
- `src/backends/agentic-store.ts`

## Changes

### NodeFsBackend (`src/backends/node-fs.ts`)

**get()**: Distinguish ENOENT (return null) from other errors (throw IOError):
```ts
async get(path: string): Promise<string | null> {
  this.validatePath(path)
  try { return await readFile(this.abs(path), 'utf-8') }
  catch (e: any) {
    if (e.code === 'ENOENT') return null
    throw new IOError(String(e))
  }
}
```

**set()**: Wrap in try/catch, throw IOError on failure:
```ts
async set(path: string, content: string): Promise<void> {
  this.validatePath(path)
  const abs = this.abs(path)
  try {
    await mkdir(dirname(abs), { recursive: true })
    await writeFile(abs, content, 'utf-8')
  } catch (e) { throw new IOError(String(e)) }
}
```

**delete()**: Swallow ENOENT only, throw IOError for others:
```ts
async delete(path: string): Promise<void> {
  this.validatePath(path)
  try { await unlink(this.abs(path)) }
  catch (e: any) {
    if (e.code !== 'ENOENT') throw new IOError(String(e))
  }
}
```

### OPFSBackend (`src/backends/opfs.ts`)

**get()**: Swallow NotFoundError only:
```ts
async get(path: string): Promise<string | null> {
  this.validatePath(path)
  try {
    const fh = await this.getFileHandle(path)
    return await (await fh.getFile()).text()
  } catch (e) {
    if (e instanceof DOMException && e.name === 'NotFoundError') return null
    throw new IOError(String(e))
  }
}
```

**set()**: Wrap in try/catch, throw IOError:
```ts
async set(path: string, content: string): Promise<void> {
  this.validatePath(path)
  try {
    const fh = await this.getFileHandle(path, true)
    const w = await fh.createWritable()
    await w.write(content)
    await w.close()
  } catch (e) { throw new IOError(String(e)) }
}
```

**delete()**: Already handles NotFoundError; wrap other errors:
```ts
async delete(path: string): Promise<void> {
  this.validatePath(path)
  // existing logic — add catch for non-NotFoundError:
  // if (e instanceof DOMException && e.name === 'NotFoundError') return
  // throw new IOError(String(e))
}
```

### AgenticStoreBackend (`src/backends/agentic-store.ts`)

Wrap `get`, `set`, `delete`, `list` in try/catch → throw `IOError(String(e))`:
```ts
async get(path: string): Promise<string | null> {
  this.validatePath(path)
  try { return (await this.store.get(this.normPath(path))) ?? null }
  catch (e) { throw new IOError(String(e)) }
}
// same pattern for set, delete, list
```

## Edge cases
- ENOENT / NotFoundError → return null (not an IOError)
- All other OS/DOMException errors → throw IOError
- SQLiteBackend already throws IOError — no changes needed

## Test cases
- Mock readFile to throw `{ code: 'EIO' }` → expect IOError from NodeFsBackend.get()
- Mock store.get to throw → expect IOError from AgenticStoreBackend.get()
- Mock OPFS getFileHandle to throw non-NotFoundError DOMException → expect IOError from OPFSBackend.get()
- ENOENT / NotFoundError still returns null (no regression)
