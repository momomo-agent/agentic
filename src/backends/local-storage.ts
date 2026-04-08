import type { StorageBackend } from '../types.js'
import { NotFoundError, IOError } from '../errors.js'

/**
 * Browser localStorage adapter. Synchronous storage exposed via async interface.
 * @example
 * const fs = new AgenticFileSystem({ storage: new LocalStorageBackend() })
 */
export class LocalStorageBackend implements StorageBackend {
  private prefix = 'afs:'

  private normalizePath(path: string): string {
    return path.startsWith('/') ? path : '/' + path
  }

  private key(path: string): string {
    return this.prefix + this.normalizePath(path)
  }

  private storage(): Storage {
    if (typeof localStorage === 'undefined') throw new IOError('localStorage not available')
    return localStorage
  }

  private validatePath(path: string): void {
    if (path === '') throw new IOError('Path cannot be empty')
  }

  /**
   * Get file content by path. Uses localStorage with afs: prefix.
   * @param path Absolute path starting with /
   * @returns File content string, or null if not found
   */
  async get(path: string): Promise<string | null> {
    this.validatePath(path)
    try {
      return this.storage().getItem(this.key(path)) ?? null
    } catch (e) {
      if (e instanceof IOError) throw e
      throw new IOError(`Failed to read "${path}": ${String(e)}`)
    }
  }

  /**
   * Write content to a file path.
   * @param path Absolute path starting with /
   * @param content File content to write
   */
  async set(path: string, content: string): Promise<void> {
    this.validatePath(path)
    try {
      this.storage().setItem(this.key(path), content)
    } catch (e) {
      if (e instanceof IOError) throw e
      throw new IOError(`Failed to write "${path}": ${String(e)}`)
    }
  }

  /**
   * Delete a file. No-op if path does not exist.
   * @param path Absolute path starting with /
   */
  async delete(path: string): Promise<void> {
    this.validatePath(path)
    try {
      this.storage().removeItem(this.key(path))
    } catch (e) {
      if (e instanceof IOError) throw e
      throw new IOError(`Failed to delete "${path}": ${String(e)}`)
    }
  }

  /**
   * List file paths, optionally filtered by prefix.
   * @param prefix Optional path prefix to filter results
   * @returns Array of absolute file paths
   */
  async list(prefix?: string): Promise<string[]> {
    try {
      const s = this.storage()
      const paths: string[] = []
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i)!
        if (!k.startsWith(this.prefix)) continue
        const path = k.slice(this.prefix.length)
        if (!prefix || path.startsWith(prefix)) paths.push(path)
      }
      return paths
    } catch (e) {
      if (e instanceof IOError) throw e
      throw new IOError(`Failed to list: ${String(e)}`)
    }
  }

  /**
   * Stream search results as an async iterable.
   * @param pattern String pattern to match against file content
   * @returns AsyncIterable yielding { path, line, content } objects
   */
  async *scanStream(pattern: string): AsyncIterable<{ path: string; line: number; content: string }> {
    for (const path of await this.list()) {
      const text = await this.get(path)
      if (!text) continue
      const lines = text.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(pattern)) yield { path, line: i + 1, content: lines[i] }
      }
    }
  }

  /**
   * Search file contents for a pattern.
   * @param pattern String pattern to match against file content
   * @returns Array of match objects with path, line number, and content
   */
  async scan(pattern: string): Promise<Array<{ path: string; line: number; content: string }>> {
    const results: Array<{ path: string; line: number; content: string }> = []
    for await (const r of this.scanStream(pattern)) results.push(r)
    return results
  }

  /**
   * Get multiple files by path in a single operation.
   * @param paths Array of absolute paths
   * @returns Record mapping each path to its content, or null if not found
   */
  async batchGet(paths: string[]): Promise<Record<string, string | null>> {
    const entries = await Promise.all(paths.map(async p => [p, await this.get(p)] as const))
    return Object.fromEntries(entries)
  }

  /**
   * Write multiple files in a single operation.
   * @param entries Record mapping absolute paths to content strings
   */
  async batchSet(entries: Record<string, string>): Promise<void> {
    await Promise.all(Object.entries(entries).map(([p, c]) => this.set(p, c)))
  }

  /**
   * Get file metadata.
   * @param path Absolute path starting with /
   * @returns Object with size, mtime, isDirectory, permissions, or null if not found
   */
  async stat(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean; permissions: { read: boolean; write: boolean } }> {
    this.validatePath(path)
    const content = this.storage().getItem(this.key(path))
    if (content === null) throw new NotFoundError(path)
    return { size: content.length, mtime: 0, isDirectory: false, permissions: { read: true, write: true } }
  }
}
