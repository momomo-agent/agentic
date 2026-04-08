# Task Design: Implement directory tree API

## Files to Modify
- `src/filesystem.ts` — add `tree()` method and `TreeNode` type usage
- `src/types.ts` — add `TreeNode` interface export
- `src/index.ts` — export `TreeNode` type

## New Types

```ts
// src/types.ts
export interface TreeNode {
  name: string       // basename of file or dir
  path: string       // full absolute path
  type: 'file' | 'dir'
  children?: TreeNode[]  // only present when type === 'dir'
  size?: number
  mtime?: number
}
```

## Function Signature

```ts
// src/filesystem.ts
async tree(prefix?: string): Promise<TreeNode[]>
```

Returns top-level nodes under `prefix` (default: `/`), each dir node recursively populated with `children`.

## Algorithm

1. Call `this.storage.list(prefix)` to get all paths under prefix
2. Build a map: `dirPath -> TreeNode` for all intermediate directories
3. For each path from `list()`:
   - Walk path segments to ensure parent dir nodes exist in map
   - Leaf node: call `this.storage.stat?.(path)` for size/mtime, create file `TreeNode`
   - Attach each node to its parent's `children` array
4. Return top-level nodes (direct children of `prefix`)

## Edge Cases
- Empty prefix → list from root `/`
- Path with no subdirs → flat list of file nodes
- `stat()` unavailable → omit size/mtime fields
- IOError from `list()` → return `[]` (same pattern as `ls()`)

## Dependencies
- `StorageBackend.list()` and optional `StorageBackend.stat()`
- No new backend changes required

## Test Cases
- `tree()` on flat structure returns file nodes with correct paths
- `tree('/docs')` returns nested dir nodes with children populated
- Dir nodes have `type: 'dir'` and `children` array
- File nodes have `type: 'file'` and no `children`
- `tree()` on empty storage returns `[]`
