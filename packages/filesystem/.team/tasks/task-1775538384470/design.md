# Design: Tests for M3 Backends and Features

## New Test Files
- `test/backends/local-storage.test.ts`
- `test/backends/tfidf-embed.test.ts`
- `test/filesystem-tree.test.ts`
- `test/filesystem-permissions.test.ts`

## local-storage.test.ts

Uses `vitest` with `jsdom` environment to mock `localStorage`.

```typescript
// @vitest-environment jsdom
import { LocalStorageBackend } from '../../src/backends/local-storage.js'

// Test cases:
// - get() returns null for missing key
// - set()/get() round-trip
// - delete() removes key
// - list() returns paths with / prefix
// - list(prefix) filters correctly
// - scan() returns matching lines with path/line/content
// - batchGet/batchSet work correctly
// - throws IOError when localStorage unavailable
```

## tfidf-embed.test.ts

```typescript
import { TfIdfEmbedBackend } from '../../src/backends/tfidf-embed.js'
import { MemoryStorage } from '../../src/backends/memory.js'

// Test cases:
// - encode() returns number[] of consistent length
// - encode() returns same vector for same input
// - search() returns results sorted by score descending
// - search() topK limits result count
// - index() processes all files in storage
// - search() after index() returns relevant files
```

## filesystem-tree.test.ts

```typescript
import { AgenticFileSystem } from '../../src/filesystem.js'
import { MemoryStorage } from '../../src/backends/memory.js'

// Test cases:
// - tree() on empty fs returns empty structure
// - tree() nests files under correct directories
// - tree() at prefix returns subtree only
// - single file at root level
// - deeply nested paths
```

## filesystem-permissions.test.ts

```typescript
// Test cases:
// - read-only fs rejects write/delete
// - write succeeds on writable fs
// - longest-prefix permission matching
// - default allow when no rule matches
```

## Dependencies
- `jsdom` dev dependency (for localStorage tests)
- All tests use `vitest` (already in project)

## Notes
- Check existing `test/local-storage-backend.test.js` and `test/tfidf-embed.test.js` — if they already cover these cases, extend rather than duplicate
- Use `MemoryStorage` as the backing store for filesystem tests to avoid I/O
