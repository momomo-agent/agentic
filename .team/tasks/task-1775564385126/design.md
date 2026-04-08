# Design: Add delete and tree agent tools

## Status
Already implemented. This design documents the existing implementation.

## Files Modified
- `src/filesystem.ts` — `getToolDefinitions()` lines 311-330, `executeTool()` lines 345-348

## Implementation

### getToolDefinitions() additions
```ts
{
  name: 'file_delete',
  description: 'Delete a file at the specified path',
  parameters: {
    type: 'object',
    properties: { path: { type: 'string', description: 'File path to delete' } },
    required: ['path']
  }
},
{
  name: 'tree',
  description: 'Get recursive directory tree structure with file metadata',
  parameters: {
    type: 'object',
    properties: { prefix: { type: 'string', description: 'Root path to display tree from (default: /)' } }
  }
}
```

### executeTool() additions
```ts
case 'file_delete':
  return await this.delete(String(input.path ?? ''))
case 'tree':
  return await this.tree(input.prefix ? String(input.prefix) : undefined)
```

## Edge Cases
- `file_delete` on missing path → delegates to `this.delete()` which is a no-op
- `tree` with no prefix → returns full tree from root
- Unknown tool name → returns `{ error: 'Unknown tool' }`

## Test Cases
- `executeTool('file_delete', { path: '/foo' })` → `{ path: '/foo' }` FileResult
- `executeTool('tree', {})` → `TreeNode[]`
- `executeTool('tree', { prefix: '/docs' })` → subtree
