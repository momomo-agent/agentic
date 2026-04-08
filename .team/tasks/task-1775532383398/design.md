# Design — Add JSDoc to Public APIs

## Files to Modify
- `src/filesystem.ts` — all public methods
- `src/types.ts` — `StorageBackend` interface methods

## JSDoc targets in `filesystem.ts`
```ts
/** Read file contents at path. Returns FileResult with content or error. */
async read(path: string): Promise<FileResult>

/** Write content to path. Rejects with error if readOnly. */
async write(path: string, content: string): Promise<FileResult>

/** Delete file at path. Rejects with error if readOnly. */
async delete(path: string): Promise<FileResult>

/** List files/dirs under prefix. Returns LsResult[] with type and optional metadata. */
async ls(prefix?: string): Promise<LsResult[]>

/** Search files for pattern. Use semantic:true for embedding-based search. */
async grep(pattern: string, options?: { semantic?: boolean }): Promise<GrepResult[]>

/** Return tool definitions for AI agent tool-use integration. */
getToolDefinitions(): object[]

/** Execute a named tool with input params. Used by AI agent runtimes. */
async executeTool(name: string, input: Record<string, unknown>): Promise<unknown>
```

## JSDoc targets in `types.ts` (`StorageBackend`)
```ts
/** Get file content by path. Returns null if not found. */
get(path: string): Promise<string | null>

/** Write content to path, creating directories as needed. */
set(path: string, content: string): Promise<void>

/** Delete file at path. No-op if not found. */
delete(path: string): Promise<void>

/** List all paths, optionally filtered by prefix. Paths must start with /. */
list(prefix?: string): Promise<string[]>

/** Search all files for pattern. Returns matching lines with path and line number. */
scan(pattern: string): Promise<Array<{ path: string; line: number; content: string }>>
```

## Edge Cases
- Comments only — no logic changes
- Do not add JSDoc to private methods

## Test Cases
- Read `src/filesystem.ts`: every public method has `/** ... */` above it
- Read `src/types.ts`: every `StorageBackend` method has `/** ... */` above it
