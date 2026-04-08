# Task Design: Normalize Backend Error Handling — Typed Throws

**Task ID:** task-1775607509173
**Priority:** P1
**Depends on:** None

## Files to Modify/Create

- `src/backends/local-storage.ts` — add try/catch with typed error re-throw
- `src/backends/opfs.ts` — log context in silent catch block
- `src/backends/node-fs.ts` — log context in silent catch block
- `test/error-consistency.test.js` (create)

## Audit Results

### Silent/missing catch blocks:

| Backend | Issue | Location |
|---------|-------|----------|
| **LocalStorageBackend** | No try/catch in `get()`, `set()`, `delete()`, `list()` | Lines 29-68 |
| **OPFSBackend** | Silent `catch {}` in `scanStream()` | Line 157 |
| **NodeFsBackend** | Silent `catch {}` in `scanStream()` | Line 109 |
| AgenticStoreBackend | All catch blocks throw IOError | OK |
| MemoryStorage | No catch blocks (in-memory) | OK |
| SQLiteBackend | All catch blocks throw IOError | OK |

## Changes

### 1. `src/backends/local-storage.ts` — Wrap operations in try/catch

**`get()` (lines 29-32):**
```ts
async get(path: string): Promise<string | null> {
  this.validatePath(path)
  try {
    return this.storage().getItem(this.key(path)) ?? null
  } catch (e) {
    if (e instanceof IOError) throw e
    throw new IOError(`Failed to read "${path}": ${String(e)}`)
  }
}
```

**`set()` (lines 39-42):**
```ts
async set(path: string, content: string): Promise<void> {
  this.validatePath(path)
  try {
    this.storage().setItem(this.key(path), content)
  } catch (e) {
    if (e instanceof IOError) throw e
    throw new IOError(`Failed to write "${path}": ${String(e)}`)
  }
}
```

**`delete()` (lines 48-51):**
```ts
async delete(path: string): Promise<void> {
  this.validatePath(path)
  try {
    this.storage().removeItem(this.key(path))
  } catch (e) {
    if (e instanceof IOError) throw e
    throw new IOError(`Failed to delete "${path}": ${String(e)}`)
  }
}
```

**`list()` (lines 58-68):**
```ts
async list(prefix?: string): Promise<string[]> {
  try {
    const s = this.storage()
    const paths: string[] = []
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i)!
      if (!k.startsWith(this.prefix)) continue
      const path = k.slice(this.prefix.length)
      if (!prefix || path.startsWith(prefix)) paths.push(path)
    }
    return paths
  } catch (e) {
    if (e instanceof IOError) throw e
    throw new IOError(`Failed to list: ${String(e)}`)
  }
}
```

### 2. `src/backends/opfs.ts` — Log in scanStream catch (line 157)

From:
```ts
} catch { /* skip unreadable files */ }
```
To:
```ts
} catch (e) { console.error('[OPFSBackend] scanStream skipping unreadable file:', e) }
```

### 3. `src/backends/node-fs.ts` — Log in scanStream catch (line 109)

From:
```ts
} catch { /* skip missing/unreadable files */ }
```
To:
```ts
} catch (e) { console.error('[NodeFsBackend] scanStream skipping unreadable file:', e) }
```

## Test File: `test/error-consistency.test.js`

Test that LocalStorageBackend wraps errors in IOError:
- Mock `localStorage.getItem` to throw → `get()` throws `IOError`
- Mock `localStorage.setItem` to throw → `set()` throws `IOError`
- Mock `localStorage.removeItem` to throw → `delete()` throws `IOError`

## Edge Cases

- `LocalStorageBackend.storage()` already throws `IOError('localStorage not available')` if localStorage is undefined — the new try/catch should check `if (e instanceof IOError) throw e` to avoid double-wrapping.
- `QuotaExceededError` from `setItem()` is a real-world scenario in browsers — wrapped in `IOError`.

## Dependencies

None.

## Verification

```bash
node --test test/error-consistency.test.js
node --test  # full suite regression
```
