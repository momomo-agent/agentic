# Design: Add SQLite Backend Adapter

## New File
- `src/backends/sqlite.ts` — SQLiteBackend class

## Modified Files
- `src/index.ts` — export SQLiteBackend

## Schema
```sql
CREATE TABLE IF NOT EXISTS files (
  path TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  size INTEGER NOT NULL,
  mtime INTEGER NOT NULL
)
```

## Class Signature (src/backends/sqlite.ts)
```typescript
import type { StorageBackend } from '../types.js'

// Accepts better-sqlite3 Database (Node) or sql.js Database (browser)
export class SQLiteBackend implements StorageBackend {
  constructor(private db: BetterSQLite3.Database | SqlJsDatabase) {}

  async get(path: string): Promise<string | null>
  async set(path: string, content: string): Promise<void>
  async delete(path: string): Promise<void>
  async list(prefix?: string): Promise<string[]>
  async scan(pattern: string): Promise<{ path: string; line: number; content: string }[]>
  async *scanStream(pattern: string): AsyncIterable<{ path: string; line: number; content: string }>
  async batchGet(paths: string[]): Promise<Record<string, string | null>>
  async batchSet(entries: Record<string, string>): Promise<void>
  async stat(path: string): Promise<{ size: number; mtime: number } | null>
}
```

## Algorithm

### Constructor
- Run `CREATE TABLE IF NOT EXISTS files (...)` on init
- Detect db type via duck-typing: `db.prepare` exists on both; use `db.exec` for schema init

### get / set / delete
- `get`: `SELECT content FROM files WHERE path = ?` → return content or null
- `set`: `INSERT OR REPLACE INTO files VALUES (?, ?, ?, ?)` with `Date.now()` as mtime, `content.length` as size
- `delete`: `DELETE FROM files WHERE path = ?`

### list(prefix?)
- `SELECT path FROM files` (no prefix) or `SELECT path FROM files WHERE path LIKE ?` with `prefix + '%'`
- Ensure all returned paths start with `/`

### scan / scanStream
- `scan`: fetch all rows matching prefix, split content by `\n`, filter lines containing pattern
- `scanStream`: iterate rows one at a time using prepared statement, yield matching lines

### batchGet / batchSet
- `batchGet`: single `SELECT` with `WHERE path IN (...)`, map results
- `batchSet`: wrap in transaction: `BEGIN; INSERT OR REPLACE ...; COMMIT`

## Path Normalization
```typescript
private norm(path: string): string {
  return path.startsWith('/') ? path : '/' + path
}
```
Apply in `get`, `set`, `delete`, `stat`.

## Error Handling
- Wrap all db calls in try/catch; throw `IOError` for SQL errors
- `get` returns null (not throws) for missing paths

## Dependencies
- `better-sqlite3` — optional peer dep for Node.js
- `sql.js` — optional peer dep for browser
- No new required deps; consumer provides the db instance

## Test Cases (test/backends/sqlite.test.ts)
- Passes shared backend contract: get/set/delete/list/scan/batchGet/batchSet
- `list()` returns paths with `/` prefix
- `batchSet` is atomic (transaction rolls back on error)
- `stat()` returns correct size and mtime
- `scanStream()` yields same results as `scan()`
