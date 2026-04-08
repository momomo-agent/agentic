// File tool — browser-compatible via AgenticFileSystem

import type { ToolDefinition } from 'agentic-core'
import type { FileResult } from '../types.js'
import type { AgenticFileSystem } from 'agentic-filesystem'

export const fileReadToolDef: ToolDefinition = {
  name: 'file_read',
  description: 'Read the contents of a file.',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path to read' },
    },
    required: ['path'],
  },
}

export const fileWriteToolDef: ToolDefinition = {
  name: 'file_write',
  description: 'Write content to a file.',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path to write' },
      content: { type: 'string', description: 'Content to write' },
    },
    required: ['path', 'content'],
  },
}

export async function executeFileRead(
  input: Record<string, unknown>,
  fs?: AgenticFileSystem,
): Promise<FileResult> {
  const path = String(input.path ?? '')
  if (!fs) return { path, action: 'read', content: 'Error: no filesystem configured' }
  const result = await fs.read(path)
  return { path, action: 'read', content: result.error ? `Error: ${result.error}` : (result.content ?? '') }
}

export async function executeFileWrite(
  input: Record<string, unknown>,
  fs?: AgenticFileSystem,
): Promise<FileResult> {
  const path = String(input.path ?? '')
  const content = String(input.content ?? '')
  if (!fs) return { path, action: 'write', content: 'Error: no filesystem configured' }
  const result = await fs.write(path, content)
  return { path, action: 'write', content: result.error ? `Error: ${result.error}` : undefined }
}
