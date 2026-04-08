// OPFSBackend — Origin Private File System backend (Chrome 86+, Safari 15.2+)
// 10x faster than IndexedDB for large files, native browser filesystem

import type { StorageBackend } from '../types.js'
import { NotFoundError, IOError } from '../errors.js'

/**
 * Browser Origin Private File System backend. ~10x faster than IndexedDB for large files. Chrome 86+, Safari 15.2+.
 * @example
 * const fs = new AgenticFileSystem({ storage: new OPFSBackend() })
 */
export class OPFSBackend implements StorageBackend {
  private root: FileSystemDirectoryHandle | null = null

  private validatePath(path: string): void {
    if (path === '') throw new IOError('Path cannot be empty')
  }

  private async getRoot(): Promise<FileSystemDirectoryHandle> {
    if (!this.root) {
      this.root = await navigator.storage.getDirectory()
    }
    return this.root
  }

  private async getDirHandle(path: string): Promise<FileSystemDirectoryHandle> {
    const parts = path.replace(/^\//, '').split('/')
    let dir = await this.getRoot()
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part)
    }
    return dir
  }

  private async getFileHandle(path: string, create = false): Promise<FileSystemFileHandle> {
    const parts = path.replace(/^\//, '').split('/')
    let dir = await this.getRoot()
    for (const part of parts.slice(0, -1)) {
      dir = await dir.getDirectoryHandle(part, { create })
    }
    return dir.getFileHandle(parts[parts.length - 1], { create })
  }

  /**
   * Get file content by path. Uses OPFS API.
   * @param path Absolute path starting with /
   * @returns File content string, or null if not found
   */
  async get(path: string): Promise<string | null> {
    this.validatePath(path)
    try {
      const fh = await this.getFileHandle(path)
      return await (await fh.getFile()).text()
    } catch (e) {
      if (e instanceof DOMException && e.name === 'NotFoundError') return null
      throw new IOError(String(e))
    }
  }

  /**
   * Write content to a file path. Uses OPFS createWritable API.
   * @param path Absolute path starting with /
   * @param content File content to write
   */
  async set(path: string, content: string): Promise<void> {
    this.validatePath(path)
    try {
      const fh = await this.getFileHandle(path, true)
      const w = await fh.createWritable()
      await w.write(content)
      await w.close()
    } catch (e) { throw new IOError(String(e)) }
  }

  /**
   * Delete a file. No-op if path does not exist.
   * @param path Absolute path starting with /
   */
  async delete(path: string): Promise<void> {
    this.validatePath(path)
    const parts = path.replace(/^\//, '').split('/')
    let dir = await this.getRoot()
    try {
      for (const part of parts.slice(0, -1)) {
        dir = await dir.getDirectoryHandle(part)
      }
      await dir.removeEntry(parts[parts.length - 1])
    } catch (e) {
      if (e instanceof DOMException && e.name === 'NotFoundError') return
      throw new IOError(String(e))
    }
  }

  /**
   * List file paths, optionally filtered by prefix.
   * @param prefix Optional path prefix to filter results
   * @returns Array of absolute file paths
   */
  async list(prefix?: string): Promise<string[]> {
    const results: string[] = []
    await this.walkDir(await this.getRoot(), '', results)
    return prefix ? results.filter(p => p.startsWith(prefix)) : results
  }

  private async walkDir(dir: FileSystemDirectoryHandle, base: string, out: string[]): Promise<void> {
    for await (const [name, handle] of (dir as unknown as AsyncIterable<[string, FileSystemHandle]>)) {
      try {
        const path = base ? `${base}/${name}` : name
        if (handle.kind === 'file') out.push('/' + path)
        else await this.walkDir(handle as FileSystemDirectoryHandle, path, out)
      } catch (err) {
        console.error(`[OPFSBackend] walkDir skipping entry "${name}":`, err)
      }
    }
  }

  /**
   * Get multiple files by path in a single operation.
   * @param paths Array of absolute paths
   * @returns Record mapping each path to its content, or null if not found
   */
  async batchGet(paths: string[]): Promise<Record<string, string | null>> {
    const results = await Promise.all(paths.map(p => this.get(p)))
    return Object.fromEntries(paths.map((p, i) => [p, results[i]]))
  }

  /**
   * Write multiple files in a single operation.
   * @param entries Record mapping absolute paths to content strings
   */
  async batchSet(entries: Record<string, string>): Promise<void> {
    await Promise.all(Object.entries(entries).map(([p, v]) => this.set(p, v)))
  }

  /**
   * Stream search results as an async iterable. Uses TextDecoderStream for streaming reads.
   * @param pattern String pattern to match against file content
   * @returns AsyncIterable yielding { path, line, content } objects
   */
  async *scanStream(pattern: string): AsyncIterable<{ path: string; line: number; content: string }> {
    for (const path of await this.list()) {
      try {
        const fh = await this.getFileHandle(path)
        const file = await fh.getFile()
        const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader()
        let lineNum = 0
        let remainder = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            if (remainder && remainder.includes(pattern)) yield { path, line: ++lineNum, content: remainder }
            break
          }
          const chunk = remainder + value
          const lines = chunk.split('\n')
          remainder = lines.pop()!
          for (const line of lines) {
            lineNum++
            if (line.includes(pattern)) yield { path, line: lineNum, content: line }
          }
        }
      } catch (e) { console.error('[OPFSBackend] scanStream skipping unreadable file:', e) }
    }
  }

  /**
   * Search file contents for a pattern.
   * @param pattern String pattern to match against file content
   * @returns Array of match objects with path, line number, and content
   */
  async scan(pattern: string): Promise<{ path: string; line: number; content: string }[]> {
    const results: { path: string; line: number; content: string }[] = []
    for await (const r of this.scanStream(pattern)) results.push(r)
    return results
  }

  /**
   * Get file metadata. Uses OPFS File API for size/mtime.
   * @param path Absolute path starting with /
   * @returns Object with size, mtime, isDirectory, or null if not found
   */
  async stat(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean; permissions: { read: boolean; write: boolean } }> {
    this.validatePath(path)
    // Try directory first — avoids browser-specific TypeMismatchError behavior
    try {
      await this.getDirHandle(path)
      return { size: 0, mtime: 0, isDirectory: true, permissions: { read: true, write: true } }
    } catch {}
    // Fall back to file
    try {
      const fh = await this.getFileHandle(path)
      const file = await fh.getFile()
      return { size: file.size, mtime: file.lastModified, isDirectory: false, permissions: { read: true, write: true } }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'NotFoundError') throw new NotFoundError(path)
      if (e instanceof NotFoundError) throw e
      throw new IOError(String(e))
    }
  }
}
