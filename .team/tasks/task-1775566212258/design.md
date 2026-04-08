# Task Design: Fix empty path validation in 3 backends

## Overview

Add empty path validation to AgenticStoreBackend, MemoryStorage, and LocalStorageBackend to match NodeFsBackend behavior. All backends must throw an error when path is an empty string in get/set/delete operations.

## Requirements

- DBB-003: Empty path rejected on all backends
- Test expectation: `backend.set('', 'v')` must reject with error
- Consistency: All backends should have identical empty path handling

## Files to Modify

### 1. `src/backends/agentic-store.ts`

**Location**: Lines 20-31 (get, set, delete methods)

**Changes**:
- Add private validation method `validatePath(path: string): void`
- Call validation at the start of `get()`, `set()`, and `delete()`
- Throw `IOError` with message "Path cannot be empty"

**Implementation**:
```typescript
private validatePath(path: string): void {
  if (path === '') {
    throw new IOError('Path cannot be empty')
  }
}

async get(path: string): Promise<string | null> {
  this.validatePath(path)
  const value = await this.store.get(this.normPath(path))
  return value ?? null
}

async set(path: string, content: string): Promise<void> {
  this.validatePath(path)
  await this.store.set(this.normPath(path), content)
}

async delete(path: string): Promise<void> {
  this.validatePath(path)
  await this.store.delete(this.normPath(path))
}
```

**Import required**: Add `IOError` to imports from `'../errors.js'`

### 2. `src/backends/memory.ts`

**Location**: Lines 6-16 (get, set, delete methods)

**Changes**:
- Add private validation method `validatePath(path: string): void`
- Call validation at the start of `get()`, `set()`, and `delete()`
- Throw `IOError` with message "Path cannot be empty"

**Implementation**:
```typescript
private validatePath(path: string): void {
  if (path === '') {
    throw new IOError('Path cannot be empty')
  }
}

async get(path: string): Promise<string | null> {
  this.validatePath(path)
  return this.store.get(path) ?? null
}

async set(path: string, content: string): Promise<void> {
  this.validatePath(path)
  this.store.set(path, content)
}

async delete(path: string): Promise<void> {
  this.validatePath(path)
  this.store.delete(path)
}
```

**Import required**: Add `import { IOError } from '../errors.js'` at top of file

### 3. `src/backends/local-storage.ts`

**Location**: Lines 20-30 (get, set, delete methods)

**Changes**:
- Add private validation method `validatePath(path: string): void`
- Call validation at the start of `get()`, `set()`, and `delete()`
- Throw `IOError` with message "Path cannot be empty"

**Implementation**:
```typescript
private validatePath(path: string): void {
  if (path === '') {
    throw new IOError('Path cannot be empty')
  }
}

async get(path: string): Promise<string | null> {
  this.validatePath(path)
  return this.storage().getItem(this.key(path)) ?? null
}

async set(path: string, content: string): Promise<void> {
  this.validatePath(path)
  this.storage().setItem(this.key(path), content)
}

async delete(path: string): Promise<void> {
  this.validatePath(path)
  this.storage().removeItem(this.key(path))
}
```

**Import already exists**: `IOError` is already imported at line 2

## Edge Cases

1. **Empty string only**: Only `''` (empty string) should be rejected, not `'/'` (root path)
2. **Whitespace paths**: Paths like `' '` or `'\t'` are NOT empty strings and should be allowed (filesystem will handle them)
3. **batchGet/batchSet**: These methods call `get()`/`set()` internally, so validation is automatic
4. **stat()**: AgenticStoreBackend has a `stat()` method that should also validate empty paths
5. **scanStream/scan**: These don't take path parameters, only patterns - no validation needed

## Error Handling

- Use `IOError` class from `src/errors.ts`
- Error message: `"Path cannot be empty"`
- Throw synchronously before any async operations
- Consistent across all three backends

## Test Verification

Existing test at `test/edge-cases.test.js:89-91` will verify:
```javascript
test(`${name}: empty path rejected`, async () => {
  await assert.rejects(() => backend.set('', 'v'))
})
```

This test runs for NodeFsBackend and AgenticStoreBackend. After this fix, it should pass for all backends.

## Dependencies

- No external dependencies
- No changes to `StorageBackend` interface
- No changes to other modules

## Unblocks

This task unblocks `task-1775565205056` (Expand edge-case tests to all backends), which requires empty path validation to be in place before adding comprehensive edge-case tests.
