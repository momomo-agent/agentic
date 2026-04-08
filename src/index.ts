// index.ts — Main exports

export { AgenticFileSystem } from './filesystem.js'
export { AgenticStoreBackend } from './backends/agentic-store.js'
export { OPFSBackend } from './backends/opfs.js'
export { NodeFsBackend } from './backends/node-fs.js'
export { ShellFS } from './shell.js'
export { shellFsTools } from './shell-tools.js'
export type { ShellTool } from './shell-tools.js'
export { MemoryStorage } from './backends/memory.js'
export { LocalStorageBackend } from './backends/local-storage.js'
export { SQLiteBackend } from './backends/sqlite.js'
export { TfIdfEmbedBackend } from './backends/tfidf-embed.js'
export { NotFoundError, PermissionDeniedError, IOError } from './errors.js'
export type {
  FileSystemConfig,
  StorageBackend,
  EmbedBackend,
  FileResult,
  GrepResult,
  LsResult,
  TreeNode,
  Permission
} from './types.js'

/**
 * Auto-select a StorageBackend based on the runtime environment.
 *
 * Detection order:
 * 1. Explicit `sqliteDb` option → SQLiteBackend
 * 2. Node.js with `better-sqlite3` installed → SQLiteBackend (auto-created DB)
 * 3. Node.js without `better-sqlite3` → NodeFsBackend
 * 4. Browser with OPFS → OPFSBackend
 * 5. Browser with IndexedDB → AgenticStoreBackend (IDB)
 * 6. Fallback → MemoryStorage
 */
export async function createBackend(options?: { rootDir?: string; sqliteDb?: unknown; sqlitePath?: string }): Promise<import('./types.js').StorageBackend> {
  if (options?.sqliteDb) {
    const { SQLiteBackend } = await import('./backends/sqlite.js')
    return new SQLiteBackend(options.sqliteDb)
  }

  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      // @ts-expect-error better-sqlite3 is an optional peer dependency
      const Database = (await import('better-sqlite3')).default
      const { join } = await import('node:path')
      const dbPath = options?.sqlitePath ?? join(process.cwd(), '.agentic-fs.db')
      const { SQLiteBackend } = await import('./backends/sqlite.js')
      return new SQLiteBackend(new Database(dbPath))
    } catch {
      // better-sqlite3 not available, fall through to NodeFsBackend
    }
    const { NodeFsBackend } = await import('./backends/node-fs.js')
    return new NodeFsBackend(options?.rootDir ?? process.cwd())
  }
  if (typeof navigator !== 'undefined' && 'storage' in navigator) {
    try {
      await navigator.storage.getDirectory()
      const { OPFSBackend } = await import('./backends/opfs.js')
      return new OPFSBackend()
    } catch {}
  }
  if (typeof indexedDB !== 'undefined') {
    const { AgenticStoreBackend } = await import('./backends/agentic-store.js')

    // Inline IDB store implementation
    class IDBStore {
      private dbp: Promise<IDBDatabase>
      constructor() {
        this.dbp = new Promise((res, rej) => {
          const req = indexedDB.open('agentic-fs', 1)
          req.onupgradeneeded = () => req.result.createObjectStore('kv')
          req.onsuccess = () => res(req.result)
          req.onerror = () => rej(req.error)
        })
      }
      private tx(mode: IDBTransactionMode) {
        return this.dbp.then(db => db.transaction('kv', mode).objectStore('kv'))
      }
      private wrap<T>(req: IDBRequest<T>): Promise<T> {
        return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error) })
      }
      async get(key: string) { return this.wrap((await this.tx('readonly')).get(key)) }
      async set(key: string, value: any) { await this.wrap((await this.tx('readwrite')).put(value, key)) }
      async delete(key: string) { await this.wrap((await this.tx('readwrite')).delete(key)) }
      async keys(): Promise<string[]> { return this.wrap((await this.tx('readonly')).getAllKeys()) as Promise<string[]> }
      async has(key: string) { return (await this.get(key)) != null }
    }

    return new AgenticStoreBackend(new IDBStore())
  }
  const { MemoryStorage } = await import('./backends/memory.js')
  return new MemoryStorage()
}

export const createDefaultBackend = createBackend
export const createAutoBackend = createBackend
