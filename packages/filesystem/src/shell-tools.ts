export interface ShellTool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, { type: string; description: string }>
    required: string[]
  }
}

export const shellFsTools: ShellTool[] = [
  {
    name: 'shell_cat',
    description: 'Read full content of a file',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'File path to read' } },
      required: ['path']
    }
  },
  {
    name: 'shell_head',
    description: 'Read first N lines of a file',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to read' },
        lines: { type: 'number', description: 'Number of lines (default 10)' }
      },
      required: ['path']
    }
  },
  {
    name: 'shell_tail',
    description: 'Read last N lines of a file',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to read' },
        lines: { type: 'number', description: 'Number of lines (default 10)' }
      },
      required: ['path']
    }
  },
  {
    name: 'shell_find',
    description: 'List files, optionally filtered by name pattern',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Base path to search' },
        name: { type: 'string', description: 'Name pattern to filter by' }
      },
      required: []
    }
  },
  {
    name: 'shell_delete',
    description: 'Delete a file at the specified path',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'File path to delete' } },
      required: ['path']
    }
  },
  {
    name: 'shell_tree',
    description: 'Display recursive directory tree structure',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Root path to display tree from (default: /)' } },
      required: []
    }
  }
]
