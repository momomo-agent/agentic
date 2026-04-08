// types.ts — Core types for agentic-filesystem

export { NotFoundError, PermissionDeniedError, IOError } from './errors.js'

export interface TreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: TreeNode[]
  size?: number
  mtime?: number
}

export interface Permission {
  read: boolean
  write: boolean
}

export interface FileSystemConfig {
  storage: StorageBackend
  embed?: EmbedBackend
  readOnly?: boolean
  permissions?: Record<string, Permission>
}

export interface StorageBackend {
  /**
   * Get file content by path.
   * @param path Absolute path starting with /
   * @returns File content string, or null if not found
   */
  get(path: string): Promise<string | null>
  /**
   * Write content to path, creating parent directories as needed.
   * @param path Absolute path starting with /
   * @param content String content to write
   */
  set(path: string, content: string): Promise<void>
  /**
   * Delete file at path. No-op if not found.
   * @param path Absolute path starting with /
   */
  delete(path: string): Promise<void>
  /**
   * List all file paths, optionally filtered by prefix.
   * @param prefix Optional path prefix to filter results
   * @returns Array of absolute paths starting with /
   */
  list(prefix?: string): Promise<string[]>
  /**
   * Search all files for pattern. Returns matching lines.
   * @param pattern Literal string to search for
   * @returns Array of matches with path, 1-based line number, and line content
   */
  scan(pattern: string): Promise<Array<{ path: string; line: number; content: string }>>
  /**
   * Streaming scan — yields matches one at a time without loading full files into memory.
   * @param pattern Literal string to search for
   */
  scanStream(pattern: string): AsyncIterable<{ path: string; line: number; content: string }>
  /**
   * Get multiple files by path in one call.
   * @param paths Array of absolute paths
   * @returns Map of path to content string, or null for missing paths
   */
  batchGet(paths: string[]): Promise<Record<string, string | null>>
  /**
   * Write multiple files in parallel.
   * @param entries Map of path to content string
   */
  batchSet(entries: Record<string, string>): Promise<void>
  /**
   * Get file metadata. Optional — not all backends implement this.
   * @param path Absolute path starting with /
   * @returns Size in bytes, mtime as Unix ms, isDirectory flag, and permissions (read/write), or null if unavailable
   */
  stat?(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean; permissions: Permission }>
}

export interface EmbedBackend {
  encode(text: string): Promise<number[]>
  search(embedding: number[], topK?: number): Promise<Array<{ path: string; score: number }>>
}

export interface FileResult {
  path: string
  content?: string
  error?: string
}

export interface GrepResult {
  path: string
  line: number
  content: string
  match: string
}

export interface LsResult {
  name: string
  type: 'file' | 'dir'
  size?: number
  mtime?: number
}
