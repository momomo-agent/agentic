# M8 DBB — Build Fix & Production Readiness

## DBB-001: TypeScript build succeeds
- Requirement: Fix AgenticStoreBackend instantiation in createBackend()
- Given: Run `npm run build` or equivalent TypeScript compilation command
- Expect: Exit code 0, no compilation errors
- Verify: dist/ directory contains compiled JavaScript output files

## DBB-002: All existing tests pass
- Requirement: Ensure all tests still pass after the fix
- Given: Run `npm test` after implementing fixes
- Expect: All 330+ tests pass without failures
- Verify: Exit code 0, test output shows 0 failures

## DBB-003: createBackend() instantiates AgenticStoreBackend in browser
- Requirement: Fix AgenticStoreBackend instantiation, implement automatic backend selection
- Given: Call createBackend() in a browser environment without OPFS support
- Expect: Returns a backend instance that can perform read/write operations
- Verify: Can write a file and read it back successfully using the returned backend

## DBB-004: createBackend() auto-selects OPFS in supported browsers
- Requirement: Implement automatic backend selection based on runtime environment
- Given: Call createBackend() in a browser with OPFS support
- Expect: Returns an OPFSBackend instance
- Verify: Backend can perform file operations and uses OPFS storage

## DBB-005: createBackend() auto-selects NodeFs in Node.js
- Requirement: Implement automatic backend selection based on runtime environment
- Given: Call createBackend() in Node.js environment
- Expect: Returns a NodeFsBackend instance
- Verify: Backend can perform file operations on the real filesystem

## DBB-006: stat() returns file metadata on AgenticStoreBackend
- Requirement: Implement stat() on AgenticStoreBackend
- Given: Write a file with known content via AgenticStoreBackend, then call stat(path)
- Expect: Returns {size: number, mtime: Date|number} where size matches content byte length
- Verify: size > 0 and mtime is present and valid

## DBB-007: stat() returns null for missing files on AgenticStoreBackend
- Requirement: Implement stat() on AgenticStoreBackend
- Given: Call stat('/nonexistent.txt') on AgenticStoreBackend
- Expect: Returns null (not an error, not undefined)
- Verify: Result === null

## DBB-008: stat() returns file metadata on OPFSBackend
- Requirement: Implement stat() on OPFSBackend
- Given: Write a file with known content via OPFSBackend, then call stat(path)
- Expect: Returns {size: number, mtime: Date|number} where size matches content byte length
- Verify: size > 0 and mtime is present and valid

## DBB-009: stat() returns null for missing files on OPFSBackend
- Requirement: Implement stat() on OPFSBackend
- Given: Call stat('/nonexistent.txt') on OPFSBackend
- Expect: Returns null
- Verify: Result === null

## DBB-010: file_delete tool available in tool definitions
- Requirement: Add delete agent tool definition
- Given: Call getToolDefinitions() on AgenticFileSystem
- Expect: Result array includes a tool with name 'file_delete'
- Verify: Tool definition has required 'path' parameter

## DBB-011: file_delete tool deletes files
- Requirement: Add delete agent tool definition
- Given: Write a file at /test.txt, then execute file_delete tool with path='/test.txt'
- Expect: File is deleted, subsequent read fails with NotFoundError
- Verify: File no longer appears in ls() results

## DBB-012: file_tree tool available in tool definitions
- Requirement: Add tree agent tool definition
- Given: Call getToolDefinitions() on AgenticFileSystem
- Expect: Result array includes a tool with name 'file_tree'
- Verify: Tool definition has required 'path' parameter

## DBB-013: file_tree tool shows directory structure
- Requirement: Add tree agent tool definition
- Given: Create files at /a/b.txt and /a/c/d.txt, then execute file_tree tool with path='/'
- Expect: Returns a tree-like string representation showing the directory hierarchy
- Verify: Output contains all created paths in a hierarchical format (indentation or tree symbols)

## DBB-014: Package is publishable
- Requirement: Production readiness
- Given: Run `npm pack` or equivalent package preparation command
- Expect: Creates a .tgz file without errors
- Verify: Package tarball contains dist/ files and package.json with correct exports
