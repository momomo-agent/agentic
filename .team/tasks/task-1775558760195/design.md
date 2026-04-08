# Task Design: Add delete and tree agent tool definitions

## Objective
Expose AgenticFileSystem.delete() and tree() as AI agent tool definitions in shell-tools.ts and filesystem.ts, making them available for AI agent integration alongside existing cat/head/tail/find tools.

## Current State
- shell-tools.ts exports shellFsTools array with 4 tools: shell_cat, shell_head, shell_tail, shell_find
- filesystem.ts has getToolDefinitions() method that returns 4 tools: file_read, file_write, grep, ls
- AgenticFileSystem already implements delete() at filesystem.ts:86-96
- AgenticFileSystem already implements tree() at filesystem.ts:135-203
- These methods are not exposed as agent tool definitions

## Files to Modify

### 1. src/shell-tools.ts
Add two new tool definitions to the shellFsTools array (after shell_find):

```typescript
{
  name: 'shell_delete',
  description: 'Delete a file at the specified path',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path to delete' }
    },
    required: ['path']
  }
},
{
  name: 'shell_tree',
  description: 'Display recursive directory tree structure',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Root path to display tree from (default: /)' }
    },
    required: []
  }
}
```

**Implementation details:**
- Add after line 56 (after shell_find definition)
- Follow existing pattern: name, description, input_schema
- shell_delete requires path parameter
- shell_tree has optional path parameter (defaults to '/')
- Maintain consistent naming: shell_* prefix for shell tools

### 2. src/filesystem.ts
Add two new tool definitions to getToolDefinitions() method (after ls tool):

```typescript
{
  name: 'file_delete',
  description: 'Delete a file at the specified path',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path to delete' }
    },
    required: ['path']
  }
},
{
  name: 'tree',
  description: 'Get recursive directory tree structure with file metadata',
  parameters: {
    type: 'object',
    properties: {
      prefix: { type: 'string', description: 'Root path to display tree from (default: /)' }
    }
  }
}
```

Add corresponding cases to executeTool() method (after ls case):

```typescript
case 'file_delete':
  return await this.delete(String(input.path ?? ''))
case 'tree':
  return await this.tree(input.prefix ? String(input.prefix) : undefined)
```

**Implementation details:**
- Add tool definitions after line 313 (after ls definition)
- Add executeTool cases after line 327 (after ls case)
- file_delete requires path parameter
- tree has optional prefix parameter (defaults to '/')
- Follow existing pattern: name, description, parameters structure
- executeTool returns FileResult for delete, TreeNode[] for tree

## Function Signatures

No new functions needed. Existing methods:
```typescript
// AgenticFileSystem (already exists)
async delete(path: string): Promise<FileResult>
async tree(prefix?: string): Promise<TreeNode[]>
```

New tool definitions:
```typescript
// shell-tools.ts
export const shellFsTools: ShellTool[] = [
  // ... existing tools
  { name: 'shell_delete', ... },
  { name: 'shell_tree', ... }
]

// filesystem.ts
getToolDefinitions() {
  return [
    // ... existing tools
    { name: 'file_delete', ... },
    { name: 'tree', ... }
  ]
}

executeTool(name: string, input: Record<string, unknown>) {
  switch (name) {
    // ... existing cases
    case 'file_delete': ...
    case 'tree': ...
  }
}
```

## Algorithm

### shell-tools.ts
1. Add shell_delete definition to shellFsTools array
2. Add shell_tree definition to shellFsTools array
3. Export updated array (no code change needed, already exported)

### filesystem.ts
1. Add file_delete definition to getToolDefinitions() return array
2. Add tree definition to getToolDefinitions() return array
3. Add 'file_delete' case to executeTool() switch statement
4. Add 'tree' case to executeTool() switch statement
5. Both cases call existing methods with appropriate parameter extraction

## Edge Cases

### shell_delete / file_delete
- **Empty path**: delete() handles this, returns FileResult with error
- **Missing file**: delete() is no-op, returns success (consistent with backend behavior)
- **Read-only filesystem**: delete() checks readOnly flag, returns PermissionDeniedError
- **Permission denied**: delete() checks permissions, returns PermissionDeniedError
- **Invalid path**: Backend handles this, delete() returns IOError

### shell_tree / tree
- **Empty/missing prefix**: Defaults to '/' (root)
- **Non-existent path**: Returns empty array (no error)
- **Permission denied**: Not currently checked by tree(), returns all files
- **Large directory**: May be slow, but no memory issues (builds incrementally)

## Error Handling

### delete tool
- Returns FileResult with error field populated on failure
- Error types: NotFoundError (if backend throws), PermissionDeniedError, IOError
- Consistent with existing file_read/file_write error handling

### tree tool
- Returns empty array on error (consistent with ls() behavior)
- No error field in TreeNode[] return type
- Errors logged internally via IOError constructor

## Dependencies

- No new dependencies
- Uses existing AgenticFileSystem methods
- Uses existing type definitions: FileResult, TreeNode, ShellTool

## Test Cases

Add to `test/shell-tools.test.ts` (new file):

```typescript
import { describe, test, expect } from 'vitest'
import { shellFsTools } from '../src/shell-tools.js'

describe('shellFsTools', () => {
  test('includes shell_delete tool', () => {
    const deleteTool = shellFsTools.find(t => t.name === 'shell_delete')
    expect(deleteTool).toBeDefined()
    expect(deleteTool!.description).toContain('Delete')
    expect(deleteTool!.input_schema.required).toContain('path')
  })

  test('includes shell_tree tool', () => {
    const treeTool = shellFsTools.find(t => t.name === 'shell_tree')
    expect(treeTool).toBeDefined()
    expect(treeTool!.description).toContain('tree')
    expect(treeTool!.input_schema.required).toEqual([])
  })

  test('all tools have required fields', () => {
    for (const tool of shellFsTools) {
      expect(tool.name).toBeTruthy()
      expect(tool.description).toBeTruthy()
      expect(tool.input_schema).toBeDefined()
      expect(tool.input_schema.type).toBe('object')
      expect(tool.input_schema.properties).toBeDefined()
      expect(Array.isArray(tool.input_schema.required)).toBe(true)
    }
  })
})
```

Add to `test/filesystem-tools.test.ts` (new file):

```typescript
import { describe, test, expect } from 'vitest'
import { AgenticFileSystem } from '../src/filesystem.js'
import { MemoryBackend } from '../src/backends/memory.js'

describe('AgenticFileSystem tool definitions', () => {
  test('getToolDefinitions includes file_delete', () => {
    const fs = new AgenticFileSystem({ storage: new MemoryBackend() })
    const tools = fs.getToolDefinitions()

    const deleteTool = tools.find(t => t.name === 'file_delete')
    expect(deleteTool).toBeDefined()
    expect(deleteTool!.description).toContain('Delete')
    expect(deleteTool!.parameters.required).toContain('path')
  })

  test('getToolDefinitions includes tree', () => {
    const fs = new AgenticFileSystem({ storage: new MemoryBackend() })
    const tools = fs.getToolDefinitions()

    const treeTool = tools.find(t => t.name === 'tree')
    expect(treeTool).toBeDefined()
    expect(treeTool!.description).toContain('tree')
  })

  test('executeTool handles file_delete', async () => {
    const fs = new AgenticFileSystem({ storage: new MemoryBackend() })
    await fs.write('/test.txt', 'content')

    const result = await fs.executeTool('file_delete', { path: '/test.txt' })
    expect(result).toHaveProperty('path', '/test.txt')
    expect(result).not.toHaveProperty('error')

    // Verify file is deleted
    const readResult = await fs.read('/test.txt')
    expect(readResult.error).toBeTruthy()
  })

  test('executeTool handles tree', async () => {
    const fs = new AgenticFileSystem({ storage: new MemoryBackend() })
    await fs.write('/dir1/file1.txt', 'content1')
    await fs.write('/dir1/file2.txt', 'content2')
    await fs.write('/dir2/file3.txt', 'content3')

    const result = await fs.executeTool('tree', {})
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)

    // Verify tree structure
    const dir1 = result.find((n: any) => n.name === 'dir1')
    expect(dir1).toBeDefined()
    expect(dir1.type).toBe('dir')
    expect(dir1.children).toBeDefined()
  })

  test('executeTool file_delete handles missing file', async () => {
    const fs = new AgenticFileSystem({ storage: new MemoryBackend() })

    const result = await fs.executeTool('file_delete', { path: '/nonexistent.txt' })
    expect(result).toHaveProperty('path', '/nonexistent.txt')
    // delete() is no-op for missing files, should not error
    expect(result).not.toHaveProperty('error')
  })

  test('executeTool tree with prefix', async () => {
    const fs = new AgenticFileSystem({ storage: new MemoryBackend() })
    await fs.write('/dir1/sub/file1.txt', 'content1')
    await fs.write('/dir1/sub/file2.txt', 'content2')
    await fs.write('/dir2/file3.txt', 'content3')

    const result = await fs.executeTool('tree', { prefix: '/dir1' })
    expect(Array.isArray(result)).toBe(true)

    // Should only include files under /dir1
    const allPaths = JSON.stringify(result)
    expect(allPaths).toContain('/dir1')
    expect(allPaths).not.toContain('/dir2')
  })
})
```

Add to `test/agent-integration.test.ts` (new file):

```typescript
import { describe, test, expect } from 'vitest'
import { AgenticFileSystem } from '../src/filesystem.js'
import { MemoryBackend } from '../src/backends/memory.js'
import { shellFsTools } from '../src/shell-tools.js'

describe('Agent tool integration', () => {
  test('shell tools and filesystem tools have consistent coverage', () => {
    const fs = new AgenticFileSystem({ storage: new MemoryBackend() })
    const fsTools = fs.getToolDefinitions()

    // Both should have delete and tree/ls capabilities
    expect(shellFsTools.find(t => t.name === 'shell_delete')).toBeDefined()
    expect(shellFsTools.find(t => t.name === 'shell_tree')).toBeDefined()
    expect(fsTools.find(t => t.name === 'file_delete')).toBeDefined()
    expect(fsTools.find(t => t.name === 'tree')).toBeDefined()
  })

  test('all filesystem tools are executable', async () => {
    const fs = new AgenticFileSystem({ storage: new MemoryBackend() })
    const tools = fs.getToolDefinitions()

    // Prepare test data
    await fs.write('/test.txt', 'test content')

    for (const tool of tools) {
      let input: Record<string, unknown> = {}

      // Provide required inputs based on tool
      if (tool.parameters.required?.includes('path')) {
        input.path = '/test.txt'
      }
      if (tool.parameters.required?.includes('content')) {
        input.content = 'new content'
      }
      if (tool.parameters.required?.includes('pattern')) {
        input.pattern = 'test'
      }

      // Should not throw
      const result = await fs.executeTool(tool.name, input)
      expect(result).toBeDefined()
    }
  })
})
```

## Verification

```bash
# Run tool definition tests
npm test -- test/shell-tools.test.ts
npm test -- test/filesystem-tools.test.ts
npm test -- test/agent-integration.test.ts

# Verify tool definitions are exported
node -e "
import { shellFsTools } from './src/shell-tools.js';
console.log('Shell tools:', shellFsTools.map(t => t.name));
"

node -e "
import { AgenticFileSystem } from './src/index.js';
import { MemoryBackend } from './src/backends/memory.js';
const fs = new AgenticFileSystem({ storage: new MemoryBackend() });
console.log('FS tools:', fs.getToolDefinitions().map(t => t.name));
"

# Test delete tool execution
node -e "
import { AgenticFileSystem } from './src/index.js';
import { MemoryBackend } from './src/backends/memory.js';
const fs = new AgenticFileSystem({ storage: new MemoryBackend() });
await fs.write('/test.txt', 'content');
const result = await fs.executeTool('file_delete', { path: '/test.txt' });
console.log('Delete result:', result);
"

# Test tree tool execution
node -e "
import { AgenticFileSystem } from './src/index.js';
import { MemoryBackend } from './src/backends/memory.js';
const fs = new AgenticFileSystem({ storage: new MemoryBackend() });
await fs.write('/dir/file.txt', 'content');
const result = await fs.executeTool('tree', {});
console.log('Tree result:', JSON.stringify(result, null, 2));
"
```

## Performance Impact

- No performance impact - only adds tool definitions (metadata)
- executeTool() switch statement adds two cases (O(1) lookup)
- Actual delete() and tree() methods already exist and are unchanged
- Tool definitions are created once per getToolDefinitions() call (typically once per agent session)

## Documentation Updates

Update README.md to document new agent tools:

```markdown
## AI Agent Integration

### Shell Tools (for shell-like interfaces)

```typescript
import { shellFsTools } from 'agentic-filesystem'

// Available tools:
// - shell_cat: Read full file content
// - shell_head: Read first N lines
// - shell_tail: Read last N lines
// - shell_find: List files with optional name filter
// - shell_delete: Delete a file
// - shell_tree: Display recursive directory tree
```

### Filesystem Tools (for agent runtimes)

```typescript
import { AgenticFileSystem } from 'agentic-filesystem'

const fs = new AgenticFileSystem({ storage: backend })
const tools = fs.getToolDefinitions()

// Available tools:
// - file_read: Read file contents
// - file_write: Write content to file
// - grep: Search for pattern (literal or semantic)
// - ls: List files in directory
// - file_delete: Delete a file
// - tree: Get recursive directory tree with metadata

// Execute a tool
const result = await fs.executeTool('file_delete', { path: '/old.txt' })
const treeResult = await fs.executeTool('tree', { prefix: '/docs' })
```
```

## Notes

- Tool naming follows existing conventions: shell_* for shell tools, file_* or operation name for filesystem tools
- delete tool respects readOnly flag and permissions (existing behavior)
- tree tool does not currently check permissions - returns all files (existing behavior)
- Consider adding permission checks to tree() in future if needed
- Tool definitions follow Anthropic/OpenAI tool schema format for compatibility
