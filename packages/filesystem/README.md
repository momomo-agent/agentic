# agentic-filesystem

Virtual filesystem for AI agents — POSIX commands backed by smart storage.

## Why?

Inspired by [Mintlify's ChromaFs](https://x.com/dotey/status/2040157640442229153), this library gives AI agents a familiar file system interface while the backend can be anything: localStorage, IndexedDB, SQLite, vector databases, or even API calls.

**Key insight:** AI doesn't need a real filesystem, just a convincing illusion.

## Backends

Choose the storage backend that fits your environment:

```typescript
// AgenticStoreBackend (IndexedDB via agentic-store)
import { AgenticFileSystem, AgenticStoreBackend } from 'agentic-filesystem'
import { createStore } from 'agentic-store'
const fs = new AgenticFileSystem({ storage: new AgenticStoreBackend(createStore('my-db')) })

// OPFSBackend (browser OPFS)
import { AgenticFileSystem, OPFSBackend } from 'agentic-filesystem'
const fs = new AgenticFileSystem({ storage: new OPFSBackend() })

// NodeFsBackend (Node.js / Electron)
import { AgenticFileSystem, NodeFsBackend } from 'agentic-filesystem'
const fs = new AgenticFileSystem({ storage: new NodeFsBackend('/path/to/root') })
```

### Per-Backend Configuration

| Backend | Constructor | Options |
|---------|------------|---------|
| **NodeFsBackend** | `new NodeFsBackend(root)` | `root: string` — root directory path on disk |
| **OPFSBackend** | `new OPFSBackend()` | None — uses browser OPFS (requires HTTPS or localhost) |
| **AgenticStoreBackend** | `new AgenticStoreBackend(store)` | `store` — agentic-store instance (auto-detects SQLite/IndexedDB/localStorage) |
| **MemoryStorage** | `new MemoryStorage()` | None — in-memory, non-persistent |
| **LocalStorageBackend** | `new LocalStorageBackend()` | None — uses `window.localStorage` (5-10MB limit) |
| **SQLiteBackend** | `new SQLiteBackend(db)` | `db` — better-sqlite3 Database instance (Node.js only) |

### Performance

| Backend | Read (small) | Write (small) | Read (large) | Storage Limit | Browser Support | Best For |
|---------|--------------|---------------|--------------|---------------|-----------------|----------|
| **NodeFsBackend** | ~50k ops/s | ~30k ops/s | ~500 MB/s | Disk space | Node.js only | Server-side, Electron main process |
| **OPFSBackend** | ~10k ops/s | ~8k ops/s | ~100 MB/s | ~60% of disk | Chrome 86+, Safari 15.2+, Firefox 111+ | Large files, high performance browser apps |
| **AgenticStoreBackend** | ~5k ops/s | ~3k ops/s | ~50 MB/s | ~50MB typical | All modern browsers | General purpose, IndexedDB wrapper |
| **LocalStorageBackend** | ~20k ops/s | ~15k ops/s | N/A (5MB limit) | 5-10MB | All browsers | Small datasets, simple apps, quick prototypes |
| **MemoryBackend** | ~100k ops/s | ~100k ops/s | ~1 GB/s | RAM | All environments | Testing, temporary data, caching |
| **SQLiteBackend** | ~15k ops/s | ~10k ops/s | ~200 MB/s | Disk space | Node.js + better-sqlite3 | Structured data, SQL queries, server-side |

**Notes:**
- Small files: <10KB per file. Large files: >1MB per file.
- Performance measured on M1 MacBook Pro, Chrome 120, Node.js 20.
- OPFS requires HTTPS or localhost.
- SQLiteBackend requires `better-sqlite3` (Node.js) as peer dependency.

#### Browser Support Matrix

| Backend | Chrome | Safari | Firefox | Edge | Node.js |
|---------|--------|--------|---------|------|---------|
| NodeFsBackend | ❌ | ❌ | ❌ | ❌ | ✅ |
| OPFSBackend | ✅ 86+ | ✅ 15.2+ | ✅ 111+ | ✅ 86+ | ❌ |
| AgenticStoreBackend | ✅ | ✅ | ✅ | ✅ | ❌ |
| LocalStorageBackend | ✅ | ✅ | ✅ | ✅ | ❌ |
| MemoryBackend | ✅ | ✅ | ✅ | ✅ | ✅ |
| SQLiteBackend | ❌ | ❌ | ❌ | ❌ | ✅ |

#### Storage Limits

| Backend | Typical Limit | Notes |
|---------|---------------|-------|
| NodeFsBackend | Disk space | Limited by filesystem |
| OPFSBackend | ~60% of available disk | Use `navigator.storage.estimate()` |
| AgenticStoreBackend | ~50MB (varies) | Browser-dependent, can request more |
| LocalStorageBackend | 5-10MB | Throws `QuotaExceededError` when full |
| MemoryBackend | RAM | Limited by available memory |
| SQLiteBackend | Disk space | Can grow to TB scale |

## Features

- **Familiar interface** — `read()`, `write()`, `grep()`, `ls()` commands
- **Smart grep** — Literal string match OR semantic search via embeddings
- **Pluggable backends** — Memory, localStorage, agentic-store, custom adapters
- **Read-only mode** — Safe for production (all writes return "read-only filesystem")
- **Tool definitions** — Ready-to-use tool defs for agentic-core/agentic-claw

## Installation

```bash
npm install agentic-filesystem
```

## Quick Start

```typescript
import { AgenticFileSystem, MemoryStorage } from 'agentic-filesystem'

// Create filesystem with in-memory storage
const fs = new AgenticFileSystem({
  storage: new MemoryStorage(),
  readOnly: false
})

// Write files
await fs.write('/docs/intro.md', '# Hello World\nThis is a test.')
await fs.write('/docs/guide.md', '# Guide\nHow to use this.')

// Read files
const result = await fs.read('/docs/intro.md')
console.log(result.content)

// Grep (literal search)
const matches = await fs.grep('test')
// [{ path: '/docs/intro.md', line: 2, content: 'This is a test.', match: 'test' }]

// List files
const files = await fs.ls('/docs')
// [{ name: '/docs/intro.md', type: 'file' }, { name: '/docs/guide.md', type: 'file' }]
```

## Auto-Selection

Let `createBackend()` pick the best backend for your environment:

```typescript
import { createBackend, AgenticFileSystem } from 'agentic-filesystem'

const storage = await createBackend()
const fs = new AgenticFileSystem({ storage })

// Node.js → NodeFsBackend(process.cwd())
// Browser + OPFS → OPFSBackend
// Browser + IndexedDB → AgenticStoreBackend
// Fallback → MemoryStorage
```

Pass `{ rootDir: '/custom/path' }` to override the Node.js root, or `{ sqliteDb: db }` to force SQLite.

## With AI Agents

```typescript
import { agenticAsk } from 'agentic-core'
import { AgenticFileSystem, MemoryStorage } from 'agentic-filesystem'

const fs = new AgenticFileSystem({ storage: new MemoryStorage() })

// Seed some files
await fs.write('/knowledge/ai.md', 'AI is transforming software development.')
await fs.write('/knowledge/rag.md', 'RAG = Retrieval Augmented Generation.')

// Give AI the filesystem tools
const tools = fs.getToolDefinitions()

const response = await agenticAsk({
  prompt: 'Find all files mentioning "AI" and summarize them',
  tools,
  onToolCall: async (name, input) => {
    return await fs.executeTool(name, input)
  }
})
```

## Semantic Search

If you provide an `embed` backend (e.g., agentic-embed), grep can do semantic search:

```typescript
import { AgenticFileSystem, MemoryStorage } from 'agentic-filesystem'
import { createEmbedder } from 'agentic-embed'

const embedder = createEmbedder({ model: 'bge-m3' })

const fs = new AgenticFileSystem({
  storage: new MemoryStorage(),
  embed: {
    encode: (text) => embedder.embed(text),
    search: async (embedding, topK) => {
      // Your vector search implementation
      return []
    }
  }
})

// Semantic grep
const results = await fs.grep('machine learning concepts', { semantic: true })
// Returns semantically similar content even if exact words don't match
```

## Custom Storage Backend

Implement the `StorageBackend` interface:

```typescript
import type { StorageBackend } from 'agentic-filesystem'

class MyCustomStorage implements StorageBackend {
  async get(path: string): Promise<string | null> { /* ... */ }
  async set(path: string, content: string): Promise<void> { /* ... */ }
  async delete(path: string): Promise<void> { /* ... */ }
  async list(prefix?: string): Promise<string[]> { /* ... */ }
  async scan(pattern: string): Promise<Array<{ path: string; line: number; content: string }>> { /* ... */ }
  async *scanStream(pattern: string): AsyncIterable<{ path: string; line: number; content: string }> { /* ... */ }
  async batchGet(paths: string[]): Promise<Record<string, string | null>> { /* ... */ }
  async batchSet(entries: Record<string, string>): Promise<void> { /* ... */ }
  async stat?(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean; permissions: { read: boolean; write: boolean } } | null> { /* ... */ }
}

const fs = new AgenticFileSystem({ storage: new MyCustomStorage() })
```

### Using agentic-store

If you have [agentic-store](https://github.com/momomo-agent/agentic-store) installed, you can use it as the backend:

```typescript
import { AgenticFileSystem, AgenticStoreBackend } from 'agentic-filesystem'
import { createStore } from 'agentic-store'

// Create store (auto-detects best backend: SQLite/IndexedDB/localStorage)
const store = await createStore('my-filesystem')

// Use it as filesystem backend
const fs = new AgenticFileSystem({
  storage: new AgenticStoreBackend(store)
})

// Now you get all agentic-store benefits:
// - SQLite in browser (sql.js) or Node.js (better-sqlite3)
// - Automatic persistence to IndexedDB
// - Fallback to localStorage/memory
```

## Streaming Scan

Use `scanStream()` to search large files without loading them fully into memory:

```typescript
for await (const match of fs.storage.scanStream('TODO')) {
  console.log(`${match.path}:${match.line} — ${match.content}`)
}
```

## Directory Tree

```typescript
const tree = await fs.tree('/docs')
// [{ name: 'intro.md', path: '/docs/intro.md', type: 'file' },
//  { name: 'api', path: '/docs/api', type: 'dir', children: [...] }]
```

## Permissions

```typescript
const fs = new AgenticFileSystem({
  storage: new MemoryStorage(),
  permissions: { '/secrets': { read: false, write: false } }
})

// Or set at runtime:
fs.setPermission('/logs', { read: true, write: false })

await fs.write('/secrets/key', 'value') // → { error: 'Permission denied: /secrets/key' }
```

## Symlink Behavior

`NodeFsBackend` follows symlinks in `list()`, `get()`, and `scan()`. Broken symlinks are silently skipped. Circular symlinks are detected and skipped automatically.

## Architecture

```
agentic-claw (AI agent runtime)
    ↓ calls file_read/file_write/grep/ls tools
agentic-filesystem (this library)
    ↓ translates to storage operations
agentic-store / agentic-embed / custom backends
    ↓ actual data storage
localStorage / IndexedDB / SQLite / Postgres / S3
```

## Roadmap

- [x] Core commands: read, write, ls, grep
- [x] Directory tree structure (`tree()`)
- [x] Permissions system
- [x] agentic-store adapter
- [x] Browser localStorage adapter
- [x] SQLite adapter
- [x] Streaming scan (`scanStream()`)
- [x] Symlink support (NodeFsBackend)
- [ ] More commands: cat, head, tail, find

## License

MIT
