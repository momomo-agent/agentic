# Task Design: Add empty path and concurrent write tests

## Overview
The edge-case and concurrent test suites already exist but are missing OPFSBackend coverage. This task adds OPFSBackend to the parameterized test suites and verifies all DBB requirements are met.

## Current State
- `test/edge-cases.test.ts` exists with 4 backends: NodeFs, Memory, AgenticStore, LocalStorage
- `test/concurrent.test.ts` exists with 4 backends: NodeFs, Memory, AgenticStore, LocalStorage
- Both files use parameterized testing pattern with backend factory functions
- Tests already cover:
  - Empty path handling (get/set/delete with empty string)
  - Special characters (spaces, unicode, dots, brackets)
  - Concurrent writes to 20 different files
  - Race conditions on same-file writes

## Problem
OPFSBackend is not included in the test suites, so M5 DBB requirement "Tests run against all backends" is not met.

## Files to Modify

### 1. `test/edge-cases.test.ts`
**Location:** Lines 29-57 (backends array)

**Change:** Add OPFSBackend factory to the backends array

```typescript
// Add after LocalStorageBackend entry
{
  name: 'OPFSBackend',
  create: async () => {
    // OPFS requires browser environment - use mock or skip in Node.js
    if (typeof navigator === 'undefined') {
      // Mock OPFS for Node.js testing
      const { OPFSBackend } = await import('../dist/index.js')
      const mockRoot = createMockOPFSRoot()
      return { backend: new OPFSBackend(mockRoot), cleanup: async () => {} }
    } else {
      const { OPFSBackend } = await import('../dist/index.js')
      const backend = new OPFSBackend()
      return {
        backend,
        cleanup: async () => {
          // Clean up OPFS files
          const paths = await backend.list()
          await Promise.all(paths.map(p => backend.delete(p)))
        }
      }
    }
  }
}
```

**Mock OPFS Helper Function:**
Add at top of file after imports:

```typescript
function createMockOPFSRoot() {
  const files = new Map<string, File>()
  const dirs = new Set<string>(['/'])

  return {
    async getDirectoryHandle(name: string, options?: any) {
      const path = '/' + name
      if (!dirs.has(path) && options?.create) {
        dirs.add(path)
      }
      return createMockDirHandle(path, files, dirs)
    },
    async getFileHandle(name: string, options?: any) {
      const path = '/' + name
      if (!files.has(path) && options?.create) {
        files.set(path, new File([''], name))
      }
      return createMockFileHandle(path, files)
    }
  }
}

function createMockDirHandle(path: string, files: Map<string, File>, dirs: Set<string>) {
  return {
    async getDirectoryHandle(name: string, options?: any) {
      const childPath = path + '/' + name
      if (!dirs.has(childPath) && options?.create) {
        dirs.add(childPath)
      }
      return createMockDirHandle(childPath, files, dirs)
    },
    async getFileHandle(name: string, options?: any) {
      const childPath = path + '/' + name
      if (!files.has(childPath) && options?.create) {
        files.set(childPath, new File([''], name))
      }
      return createMockFileHandle(childPath, files)
    },
    async removeEntry(name: string) {
      const childPath = path + '/' + name
      files.delete(childPath)
      dirs.delete(childPath)
    }
  }
}

function createMockFileHandle(path: string, files: Map<string, File>) {
  return {
    async getFile() {
      return files.get(path) || new File([''], path.split('/').pop()!)
    },
    async createWritable() {
      return {
        async write(content: string) {
          const name = path.split('/').pop()!
          files.set(path, new File([content], name))
        },
        async close() {}
      }
    }
  }
}
```

### 2. `test/concurrent.test.ts`
**Location:** Lines 30-58 (backends array)

**Change:** Add identical OPFSBackend factory entry as in edge-cases.test.ts

Copy the same backend factory and mock helper functions from edge-cases.test.ts.

## Algorithm

### Test Execution Flow
1. For each backend in the array (including new OPFSBackend):
   - Create backend instance via factory function
   - Run all test cases in the describe block
   - Call cleanup function to remove test data
   - Move to next backend

### OPFS Mock Strategy
- In Node.js environment: use mock FileSystemDirectoryHandle/FileSystemFileHandle
- In browser environment: use real OPFS API
- Mock implements minimal OPFS API surface needed by OPFSBackend:
  - `getDirectoryHandle(name, {create})`
  - `getFileHandle(name, {create})`
  - `removeEntry(name)`
  - `FileSystemFileHandle.getFile()` → returns File object
  - `FileSystemFileHandle.createWritable()` → returns WritableStream

## Edge Cases

### Empty Path Handling
- OPFSBackend should return null for `get('')`
- OPFSBackend should reject or ignore `set('', content)`
- Existing tests already verify this behavior

### Concurrent Writes
- OPFS uses browser's file locking mechanism
- Concurrent writes to different files should succeed (20 files test)
- Concurrent writes to same file should complete without corruption
- Existing tests already verify this behavior

### Special Characters
- OPFS supports unicode and special characters in filenames
- Existing tests verify spaces, unicode, dots, brackets
- OPFSBackend should pass all existing special character tests

## Dependencies
- No new dependencies required
- Uses existing OPFSBackend from `src/backends/opfs.ts`
- Mock OPFS API uses standard File and Map objects

## Error Handling
- Mock OPFS should throw NotFoundError for missing files (consistent with real OPFS)
- Cleanup function should handle missing files gracefully (delete may fail if already deleted)
- Test framework will catch and report any unexpected errors

## Testing Strategy
1. Run `npm test -- test/edge-cases.test.ts` to verify OPFSBackend passes all edge-case tests
2. Run `npm test -- test/concurrent.test.ts` to verify OPFSBackend passes all concurrent tests
3. Verify test count increases by ~30 tests (number of test cases × 1 new backend)
4. All tests should pass with 0 failures

## Verification Commands
```bash
# Run edge-case tests
npm test -- test/edge-cases.test.ts

# Run concurrent tests
npm test -- test/concurrent.test.ts

# Verify OPFSBackend is tested
npm test -- test/edge-cases.test.ts 2>&1 | grep "OPFSBackend"
npm test -- test/concurrent.test.ts 2>&1 | grep "OPFSBackend"

# Run all tests
npm test
```

## Success Criteria
- OPFSBackend added to both test files
- All existing tests pass for OPFSBackend
- Test output shows "OPFSBackend edge cases" and "OPFSBackend concurrent operations" test suites
- Total test count increases by ~30 tests
- No test failures or errors
- M5 DBB requirement "Tests run against all backends" is satisfied
