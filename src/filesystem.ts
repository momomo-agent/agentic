// filesystem.ts — Virtual filesystem implementation

import type { FileSystemConfig, FileResult, GrepResult, LsResult, TreeNode, Permission } from './types.js'
import { NotFoundError, PermissionDeniedError, IOError } from './errors.js'

export class AgenticFileSystem {
  private storage: FileSystemConfig['storage']
  private embed?: FileSystemConfig['embed']
  private readOnly: boolean
  private permissions: Map<string, Permission>

  constructor(config: FileSystemConfig) {
    this.storage = config.storage
    this.embed = config.embed
    this.readOnly = config.readOnly ?? false
    this.permissions = new Map(Object.entries(config.permissions ?? {}))
  }

  setPermission(path: string, perm: Permission): void {
    const normalized = path.startsWith('/') ? path : '/' + path
    this.permissions.set(normalized, perm)
  }

  private checkPermission(path: string, op: 'read' | 'write'): void {
    const normalized = path.startsWith('/') ? path : '/' + path
    // Exact match first
    if (this.permissions.has(normalized)) {
      if (!this.permissions.get(normalized)![op]) throw new PermissionDeniedError(path)
      return
    }
    // Longest prefix match
    let best: Permission | undefined
    let bestLen = -1
    for (const [key, perm] of this.permissions) {
      const prefix = key.endsWith('/') ? key : key + '/'
      if ((normalized === key || normalized.startsWith(prefix)) && key.length > bestLen) {
        best = perm
        bestLen = key.length
      }
    }
    if (best && !best[op]) throw new PermissionDeniedError(path)
  }

  // ── Core file operations ──

  /**
   * Read file contents at path.
   * @param path Absolute path starting with /
   * @returns FileResult with content, or error message if not found or permission denied
   */
  async read(path: string): Promise<FileResult> {
    try {
      this.checkPermission(path, 'read')
      const content = await this.storage.get(path)
      if (content === null) throw new NotFoundError(path)
      return { path, content }
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof PermissionDeniedError) {
        return { path, error: err.message }
      }
      return { path, error: new IOError(String(err)).message }
    }
  }

  /**
   * Write content to path. Returns error if readOnly or permission denied.
   * @param path Absolute path starting with /
   * @param content String content to write
   */
  async write(path: string, content: string): Promise<FileResult> {
    if (this.readOnly) return { path, error: new PermissionDeniedError('Read-only file system').message }
    try {
      this.checkPermission(path, 'write')
      await this.storage.set(path, content)
      return { path }
    } catch (err) {
      if (err instanceof PermissionDeniedError) return { path, error: err.message }
      return { path, error: new IOError(String(err)).message }
    }
  }

  /**
   * Delete file at path. Returns error if readOnly or permission denied.
   * @param path Absolute path starting with /
   */
  async delete(path: string): Promise<FileResult> {
    if (this.readOnly) return { path, error: new PermissionDeniedError('Read-only file system').message }
    try {
      this.checkPermission(path, 'write')
      await this.storage.delete(path)
      return { path }
    } catch (err) {
      if (err instanceof PermissionDeniedError) return { path, error: err.message }
      return { path, error: new IOError(String(err)).message }
    }
  }

  /** List files under prefix. Returns LsResult[] with name, type, size, mtime. */
  async ls(prefix?: string): Promise<LsResult[]> {
    try {
      const paths = await this.storage.list(prefix)
      const seen = new Set<string>()
      const results: LsResult[] = []

      for (const p of paths) {
        // Strip prefix to get relative path
        const rel = prefix ? p.slice(prefix.endsWith('/') ? prefix.length : prefix.length + 1) : p.replace(/^\//, '')
        const parts = rel.split('/')
        if (parts.length > 1) {
          // It's inside a subdirectory — emit the dir entry
          const dirName = (prefix ? prefix.replace(/\/?$/, '/') : '/') + parts[0]
          if (!seen.has(dirName)) {
            seen.add(dirName)
            results.push({ name: dirName, type: 'dir' })
          }
        } else {
          // File entry - get metadata if stat() is available
          let meta = null
          try { meta = await this.storage.stat?.(p) ?? null } catch { /* NotFoundError: file deleted between list() and stat() */ }
          results.push({ name: p, type: 'file', size: meta?.size, mtime: meta?.mtime })
        }
      }
      return results
    } catch (err) {
      // Log IOError but return empty array to maintain existing behavior
      new IOError(String(err))
      return []
    }
  }

  /** Return recursive directory tree under prefix (default: '/'). */
  async tree(prefix?: string): Promise<TreeNode[]> {
    try {
      const root = prefix ?? '/'
      const paths = await this.storage.list(root)
      const nodes = new Map<string, TreeNode>()

      const getOrCreateDir = (dirPath: string): TreeNode => {
        if (!nodes.has(dirPath)) {
          nodes.set(dirPath, {
            name: dirPath.split('/').filter(Boolean).pop() ?? dirPath,
            path: dirPath,
            type: 'dir',
            children: []
          })
        }
        return nodes.get(dirPath)!
      }

      for (const p of paths) {
        let meta = null
        try { meta = await this.storage.stat?.(p) ?? null } catch { /* NotFoundError: skip metadata */ }
        const fileNode: TreeNode = {
          name: p.split('/').filter(Boolean).pop() ?? p,
          path: p,
          type: 'file',
          size: meta?.size,
          mtime: meta?.mtime
        }

        // Walk segments to build parent dirs
        const parts = p.split('/').filter(Boolean)
        // parts for root prefix
        const rootParts = root.split('/').filter(Boolean)
        const relativeParts = parts.slice(rootParts.length)

        if (relativeParts.length <= 1) {
          // Direct child of root
          nodes.set(p, fileNode)
        } else {
          // Build intermediate dirs and attach
          let currentPath = '/' + rootParts.join('/')
          for (let i = 0; i < relativeParts.length - 1; i++) {
            const parentPath = currentPath
            currentPath = currentPath === '/' ? '/' + relativeParts[i] : currentPath + '/' + relativeParts[i]
            const dir = getOrCreateDir(currentPath)
            const parent = parentPath === root ? null : getOrCreateDir(parentPath)
            if (parent && !parent.children!.find(c => c.path === currentPath)) {
              parent.children!.push(dir)
            }
          }
          const parentPath = currentPath
          const parent = parentPath === root ? null : getOrCreateDir(parentPath)
          if (parent) {
            if (!parent.children!.find(c => c.path === p)) parent.children!.push(fileNode)
          } else {
            nodes.set(p, fileNode)
          }
        }
      }

      // Return top-level nodes (direct children of root)
      const rootNorm = root.endsWith('/') ? root.slice(0, -1) : root
      return Array.from(nodes.values()).filter(n => {
        const parent = n.path.substring(0, n.path.lastIndexOf('/')) || '/'
        return parent === rootNorm || parent === rootNorm + '/'
      })
    } catch {
      return []
    }
  }

  // ── Batch & streaming operations ──

  /**
   * Batch-get multiple files by path.
   * @param paths Array of absolute file paths
   * @returns Record mapping each path to its content, or null if not found
   */
  async batchGet(paths: string[]): Promise<Record<string, string | null>> {
    return this.storage.batchGet(paths)
  }

  /**
   * Batch-set multiple files at once. Throws if readOnly.
   * @param entries Record mapping absolute file paths to content strings
   */
  async batchSet(entries: Record<string, string>): Promise<void> {
    if (this.readOnly) throw new PermissionDeniedError('Read-only file system')
    return this.storage.batchSet(entries)
  }

  /**
   * Stream grep results as an async iterable.
   * @param pattern Search pattern (matched against file content)
   * @returns AsyncIterable yielding { path, line, content } match objects
   */
  scanStream(pattern: string): AsyncIterable<{ path: string; line: number; content: string }> {
    return this.storage.scanStream(pattern)
  }

  // ── Smart grep with multiple strategies ──

  /** Search files for pattern. Use semantic:true for embedding-based search. */
  async grep(pattern: string, options?: { semantic?: boolean }): Promise<GrepResult[]> {
    // Strategy 1: Semantic search via embeddings
    if (options?.semantic && this.embed) {
      return await this.semanticGrep(pattern)
    }

    // Strategy 2: Full-text scan (literal string match)
    return await this.literalGrep(pattern)
  }

  private async literalGrep(pattern: string): Promise<GrepResult[]> {
    try {
      const results = await this.storage.scan(pattern)
      return results.map(({ path, line, content }) => ({
        path,
        line,
        content,
        match: pattern
      }))
    } catch (err) {
      // Log IOError but return empty array to maintain existing behavior
      new IOError(String(err))
      return []
    }
  }

  private async semanticGrep(query: string): Promise<GrepResult[]> {
    if (!this.embed) return []

    try {
      const embedding = await this.embed.encode(query)
      const results = await this.embed.search(embedding, 10)

      const matches: GrepResult[] = []
      for (const { path, score } of results) {
        const content = await this.storage.get(path)
        if (content) {
          // Return first line as preview
          const firstLine = content.split('\n')[0]
          matches.push({
            path,
            line: 1,
            content: firstLine,
            match: `(semantic match, score: ${score.toFixed(2)})`
          })
        }
      }

      return matches
    } catch (err) {
      // Log IOError but return empty array to maintain existing behavior
      new IOError(String(err))
      return []
    }
  }

  // ── Tool definitions for AI agents ──

  /** Return tool definitions for AI agent tool-use integration. */
  getToolDefinitions() {
    return [
      {
        name: 'file_read',
        description: 'Read the contents of a file',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to read' }
          },
          required: ['path']
        }
      },
      {
        name: 'file_write',
        description: 'Write content to a file',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to write' },
            content: { type: 'string', description: 'Content to write' }
          },
          required: ['path', 'content']
        }
      },
      {
        name: 'grep',
        description: 'Search for pattern in files (supports literal and semantic search)',
        parameters: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Search pattern or query' },
            semantic: { type: 'boolean', description: 'Use semantic search instead of literal match' }
          },
          required: ['pattern']
        }
      },
      {
        name: 'ls',
        description: 'List files in directory',
        parameters: {
          type: 'object',
          properties: {
            prefix: { type: 'string', description: 'Directory prefix to list' }
          }
        }
      },
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
        name: 'file_tree',
        description: 'Get recursive directory tree structure with file metadata',
        parameters: {
          type: 'object',
          properties: {
            prefix: { type: 'string', description: 'Root path to display tree from (default: /)' }
          }
        }
      },
      {
        name: 'batch_get',
        description: 'Read multiple files at once by path',
        parameters: {
          type: 'object',
          properties: {
            paths: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of absolute file paths to read'
            }
          },
          required: ['paths']
        }
      },
      {
        name: 'batch_set',
        description: 'Write multiple files at once',
        parameters: {
          type: 'object',
          properties: {
            entries: {
              type: 'object',
              additionalProperties: { type: 'string' },
              description: 'Map of absolute file paths to content strings'
            }
          },
          required: ['entries']
        }
      },
      {
        name: 'grep_stream',
        description: 'Stream grep results for large result sets',
        parameters: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'Search pattern to match against file content'
            }
          },
          required: ['pattern']
        }
      }
    ]
  }

  /** Execute a named tool with input params. Used by AI agent runtimes. */
  async executeTool(name: string, input: Record<string, unknown>) {
    switch (name) {
      case 'file_read':
        return await this.read(String(input.path ?? ''))
      case 'file_write':
        return await this.write(String(input.path ?? ''), String(input.content ?? ''))
      case 'grep':
        return await this.grep(String(input.pattern ?? ''), { semantic: Boolean(input.semantic) })
      case 'ls':
        return await this.ls(input.prefix ? String(input.prefix) : undefined)
      case 'file_delete':
        return await this.delete(String(input.path ?? ''))
      case 'file_tree':
        return await this.tree(input.prefix ? String(input.prefix) : undefined)
      case 'batch_get':
        return await this.batchGet(input.paths as string[])
      case 'batch_set':
        return await this.batchSet(input.entries as Record<string, string>)
      case 'grep_stream': {
        const results: Array<{ path: string; line: number; content: string }> = []
        for await (const r of this.scanStream(input.pattern as string)) {
          results.push(r)
        }
        return results
      }
      default:
        return { error: 'Unknown tool' }
    }
  }
}
