// sqlite.ts — SQLite backend adapter for agentic-filesystem

import type { StorageBackend } from '../types.js'
import { NotFoundError, IOError } from '../errors.js'

// Minimal duck-typed interface compatible with better-sqlite3 and sql.js
interface SqliteDb {
  exec(sql: string): void
  prepare(sql: string): {
    run(...args: unknown[]): void
    get(...args: unknown[]): Record<string, unknown> | undefined
    all(...args: unknown[]): Record<string, unknown>[]
  }
}

/**
 * SQLite backend adapter. Accepts a better-sqlite3 (Node.js) or sql.js (browser) database instance.
 * @example
 * import Database from 'better-sqlite3'
 * const fs = new AgenticFileSystem({ storage: new SQLiteBackend(new Database('data.db')) })
 */
export class SQLiteBackend implements StorageBackend {
  private db: SqliteDb

  constructor(db: unknown) {
    this.db = db as SqliteDb
    this.db.exec(`CREATE TABLE IF NOT EXISTS files (
      path TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      size INTEGER NOT NULL,
      mtime INTEGER NOT NULL
    )`)
  }

  private norm(path: string): string {
    if (path === '') throw new IOError('Path cannot be empty')
    return path.startsWith('/') ? path : '/' + path
  }

  /**
   * Get file content by path. Uses SQL SELECT query.
   * @param path Absolute path starting with /
   * @returns File content string, or null if not found
   */
  async get(path: string): Promise<string | null> {
    try {
      const row = this.db.prepare('SELECT content FROM files WHERE path = ?').get(this.norm(path))
      return row ? (row['content'] as string) : null
    } catch (e) { throw new IOError(String(e)) }
  }

  /**
   * Write content to a file path. Uses INSERT OR REPLACE with size and mtime.
   * @param path Absolute path starting with /
   * @param content File content to write
   */
  async set(path: string, content: string): Promise<void> {
    try {
      this.db.prepare('INSERT OR REPLACE INTO files VALUES (?, ?, ?, ?)').run(this.norm(path), content, content.length, Date.now())
    } catch (e) { throw new IOError(String(e)) }
  }

  /**
   * Delete a file. No-op if path does not exist.
   * @param path Absolute path starting with /
   */
  async delete(path: string): Promise<void> {
    try {
      this.db.prepare('DELETE FROM files WHERE path = ?').run(this.norm(path))
    } catch (e) { throw new IOError(String(e)) }
  }

  /**
   * List file paths, optionally filtered by prefix. Uses SQL LIKE for prefix matching.
   * @param prefix Optional path prefix to filter results
   * @returns Array of absolute file paths
   */
  async list(prefix?: string): Promise<string[]> {
    try {
      const rows = prefix
        ? this.db.prepare('SELECT path FROM files WHERE path LIKE ?').all(prefix + '%')
        : this.db.prepare('SELECT path FROM files').all()
      return rows.map(r => this.norm(r['path'] as string))
    } catch (e) { throw new IOError(String(e)) }
  }

  /**
   * Stream search results as an async iterable. Loads all rows then yields matches.
   * @param pattern String pattern to match against file content
   * @returns AsyncIterable yielding { path, line, content } objects
   */
  async *scanStream(pattern: string): AsyncIterable<{ path: string; line: number; content: string }> {
    const rows = this.db.prepare('SELECT path, content FROM files').all()
    for (const row of rows) {
      const path = this.norm(row['path'] as string)
      const lines = (row['content'] as string).split('\n')
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
  async scan(pattern: string): Promise<{ path: string; line: number; content: string }[]> {
    const results: { path: string; line: number; content: string }[] = []
    for await (const r of this.scanStream(pattern)) results.push(r)
    return results
  }

  /**
   * Get multiple files by path in a single operation.
   * @param paths Array of absolute paths
   * @returns Record mapping each path to its content, or null if not found
   */
  async batchGet(paths: string[]): Promise<Record<string, string | null>> {
    return Object.fromEntries(await Promise.all(paths.map(async p => [p, await this.get(p)])))
  }

  /**
   * Write multiple files in a single operation. Uses BEGIN/COMMIT transaction.
   * @param entries Record mapping absolute paths to content strings
   */
  async batchSet(entries: Record<string, string>): Promise<void> {
    try {
      this.db.exec('BEGIN')
      const stmt = this.db.prepare('INSERT OR REPLACE INTO files VALUES (?, ?, ?, ?)')
      const mtime = Date.now()
      for (const [p, c] of Object.entries(entries)) stmt.run(this.norm(p), c, c.length, mtime)
      this.db.exec('COMMIT')
    } catch (e) {
      try { this.db.exec('ROLLBACK') } catch {}
      throw new IOError(String(e))
    }
  }

  /**
   * Get file metadata. Reads size and mtime from the files table.
   * @param path Absolute path starting with /
   * @returns Object with size, mtime, isDirectory, or null if not found
   */
  async stat(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean; permissions: { read: boolean; write: boolean } }> {
    try {
      const row = this.db.prepare('SELECT size, mtime FROM files WHERE path = ?').get(this.norm(path))
      if (!row) throw new NotFoundError(path)
      return { size: row['size'] as number, mtime: row['mtime'] as number, isDirectory: false, permissions: { read: true, write: true } }
    } catch (e) {
      if (e instanceof NotFoundError || e instanceof IOError) throw e
      throw new IOError(String(e))
    }
  }
}

