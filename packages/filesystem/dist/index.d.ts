declare class NotFoundError extends Error {
    constructor(path: string);
}
declare class PermissionDeniedError extends Error {
    constructor(msg?: string);
}
declare class IOError extends Error {
    constructor(msg: string);
}

interface TreeNode {
    name: string;
    path: string;
    type: 'file' | 'dir';
    children?: TreeNode[];
    size?: number;
    mtime?: number;
}
interface Permission {
    read: boolean;
    write: boolean;
}
interface FileSystemConfig {
    storage: StorageBackend;
    embed?: EmbedBackend;
    readOnly?: boolean;
    permissions?: Record<string, Permission>;
}
interface StorageBackend {
    /**
     * Get file content by path.
     * @param path Absolute path starting with /
     * @returns File content string, or null if not found
     */
    get(path: string): Promise<string | null>;
    /**
     * Write content to path, creating parent directories as needed.
     * @param path Absolute path starting with /
     * @param content String content to write
     */
    set(path: string, content: string): Promise<void>;
    /**
     * Delete file at path. No-op if not found.
     * @param path Absolute path starting with /
     */
    delete(path: string): Promise<void>;
    /**
     * List all file paths, optionally filtered by prefix.
     * @param prefix Optional path prefix to filter results
     * @returns Array of absolute paths starting with /
     */
    list(prefix?: string): Promise<string[]>;
    /**
     * Search all files for pattern. Returns matching lines.
     * @param pattern Literal string to search for
     * @returns Array of matches with path, 1-based line number, and line content
     */
    scan(pattern: string): Promise<Array<{
        path: string;
        line: number;
        content: string;
    }>>;
    /**
     * Streaming scan — yields matches one at a time without loading full files into memory.
     * @param pattern Literal string to search for
     */
    scanStream(pattern: string): AsyncIterable<{
        path: string;
        line: number;
        content: string;
    }>;
    /**
     * Get multiple files by path in one call.
     * @param paths Array of absolute paths
     * @returns Map of path to content string, or null for missing paths
     */
    batchGet(paths: string[]): Promise<Record<string, string | null>>;
    /**
     * Write multiple files in parallel.
     * @param entries Map of path to content string
     */
    batchSet(entries: Record<string, string>): Promise<void>;
    /**
     * Get file metadata. Optional — not all backends implement this.
     * @param path Absolute path starting with /
     * @returns Size in bytes, mtime as Unix ms, isDirectory flag, and permissions (read/write), or null if unavailable
     */
    stat?(path: string): Promise<{
        size: number;
        mtime: number;
        isDirectory: boolean;
        permissions: Permission;
    }>;
}
interface EmbedBackend {
    encode(text: string): Promise<number[]>;
    search(embedding: number[], topK?: number): Promise<Array<{
        path: string;
        score: number;
    }>>;
}
interface FileResult {
    path: string;
    content?: string;
    error?: string;
}
interface GrepResult {
    path: string;
    line: number;
    content: string;
    match: string;
}
interface LsResult {
    name: string;
    type: 'file' | 'dir';
    size?: number;
    mtime?: number;
}

declare class AgenticFileSystem {
    private storage;
    private embed?;
    private readOnly;
    private permissions;
    constructor(config: FileSystemConfig);
    setPermission(path: string, perm: Permission): void;
    private checkPermission;
    /**
     * Read file contents at path.
     * @param path Absolute path starting with /
     * @returns FileResult with content, or error message if not found or permission denied
     */
    read(path: string): Promise<FileResult>;
    /**
     * Write content to path. Returns error if readOnly or permission denied.
     * @param path Absolute path starting with /
     * @param content String content to write
     */
    write(path: string, content: string): Promise<FileResult>;
    /**
     * Delete file at path. Returns error if readOnly or permission denied.
     * @param path Absolute path starting with /
     */
    delete(path: string): Promise<FileResult>;
    /** List files under prefix. Returns LsResult[] with name, type, size, mtime. */
    ls(prefix?: string): Promise<LsResult[]>;
    /** Return recursive directory tree under prefix (default: '/'). */
    tree(prefix?: string): Promise<TreeNode[]>;
    /**
     * Batch-get multiple files by path.
     * @param paths Array of absolute file paths
     * @returns Record mapping each path to its content, or null if not found
     */
    batchGet(paths: string[]): Promise<Record<string, string | null>>;
    /**
     * Batch-set multiple files at once. Throws if readOnly.
     * @param entries Record mapping absolute file paths to content strings
     */
    batchSet(entries: Record<string, string>): Promise<void>;
    /**
     * Stream grep results as an async iterable.
     * @param pattern Search pattern (matched against file content)
     * @returns AsyncIterable yielding { path, line, content } match objects
     */
    scanStream(pattern: string): AsyncIterable<{
        path: string;
        line: number;
        content: string;
    }>;
    /** Search files for pattern. Use semantic:true for embedding-based search. */
    grep(pattern: string, options?: {
        semantic?: boolean;
    }): Promise<GrepResult[]>;
    private literalGrep;
    private semanticGrep;
    /** Return tool definitions for AI agent tool-use integration. */
    getToolDefinitions(): ({
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                path: {
                    type: string;
                    description: string;
                };
                content?: undefined;
                pattern?: undefined;
                semantic?: undefined;
                prefix?: undefined;
                paths?: undefined;
                entries?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                path: {
                    type: string;
                    description: string;
                };
                content: {
                    type: string;
                    description: string;
                };
                pattern?: undefined;
                semantic?: undefined;
                prefix?: undefined;
                paths?: undefined;
                entries?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                pattern: {
                    type: string;
                    description: string;
                };
                semantic: {
                    type: string;
                    description: string;
                };
                path?: undefined;
                content?: undefined;
                prefix?: undefined;
                paths?: undefined;
                entries?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                prefix: {
                    type: string;
                    description: string;
                };
                path?: undefined;
                content?: undefined;
                pattern?: undefined;
                semantic?: undefined;
                paths?: undefined;
                entries?: undefined;
            };
            required?: undefined;
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                paths: {
                    type: string;
                    items: {
                        type: string;
                    };
                    description: string;
                };
                path?: undefined;
                content?: undefined;
                pattern?: undefined;
                semantic?: undefined;
                prefix?: undefined;
                entries?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                entries: {
                    type: string;
                    additionalProperties: {
                        type: string;
                    };
                    description: string;
                };
                path?: undefined;
                content?: undefined;
                pattern?: undefined;
                semantic?: undefined;
                prefix?: undefined;
                paths?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                pattern: {
                    type: string;
                    description: string;
                };
                path?: undefined;
                content?: undefined;
                semantic?: undefined;
                prefix?: undefined;
                paths?: undefined;
                entries?: undefined;
            };
            required: string[];
        };
    })[];
    /** Execute a named tool with input params. Used by AI agent runtimes. */
    executeTool(name: string, input: Record<string, unknown>): Promise<void | Record<string, string | null> | FileResult | LsResult[] | {
        path: string;
        line: number;
        content: string;
    }[]>;
}

interface AgenticStore {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    delete(key: string): Promise<void>;
    keys(): Promise<string[]>;
    has(key: string): Promise<boolean>;
}
/**
 * Key-value store backend wrapping any store with get/set/delete/keys/has. Works in browser and Node.js.
 * @example
 * const fs = new AgenticFileSystem({ storage: new AgenticStoreBackend(myStore) })
 */
declare class AgenticStoreBackend implements StorageBackend {
    private store;
    constructor(store: AgenticStore);
    private normPath;
    private validatePath;
    /**
     * Get file content by path.
     * @param path Absolute path starting with /
     * @returns File content string, or null if not found
     */
    get(path: string): Promise<string | null>;
    /**
     * Write content to a file path. Stores mtime metadata via \x00mtime key suffix.
     * @param path Absolute path starting with /
     * @param content File content to write
     */
    set(path: string, content: string): Promise<void>;
    /**
     * Delete a file. No-op if path does not exist.
     * @param path Absolute path starting with /
     */
    delete(path: string): Promise<void>;
    /**
     * List file paths, optionally filtered by prefix.
     * @param prefix Optional path prefix to filter results
     * @returns Array of absolute file paths
     */
    list(prefix?: string): Promise<string[]>;
    /**
     * Get multiple files by path in a single operation.
     * @param paths Array of absolute paths
     * @returns Record mapping each path to its content, or null if not found
     */
    batchGet(paths: string[]): Promise<Record<string, string | null>>;
    /**
     * Write multiple files in a single operation.
     * @param entries Record mapping absolute paths to content strings
     */
    batchSet(entries: Record<string, string>): Promise<void>;
    /**
     * Stream search results as an async iterable.
     * @param pattern String pattern to match against file content
     * @returns AsyncIterable yielding { path, line, content } objects
     */
    scanStream(pattern: string): AsyncIterable<{
        path: string;
        line: number;
        content: string;
    }>;
    /**
     * Search file contents for a pattern.
     * @param pattern String pattern to match against file content
     * @returns Array of match objects with path, line number, and content
     */
    scan(pattern: string): Promise<Array<{
        path: string;
        line: number;
        content: string;
    }>>;
    /**
     * Get file metadata. Uses \x00mtime key suffix for mtime storage.
     * @param path Absolute path starting with /
     * @returns Object with size, mtime, isDirectory, or null if not found
     */
    stat(path: string): Promise<{
        size: number;
        mtime: number;
        isDirectory: boolean;
        permissions: {
            read: boolean;
            write: boolean;
        };
    }>;
}

/**
 * Browser Origin Private File System backend. ~10x faster than IndexedDB for large files. Chrome 86+, Safari 15.2+.
 * @example
 * const fs = new AgenticFileSystem({ storage: new OPFSBackend() })
 */
declare class OPFSBackend implements StorageBackend {
    private root;
    private validatePath;
    private getRoot;
    private getDirHandle;
    private getFileHandle;
    /**
     * Get file content by path. Uses OPFS API.
     * @param path Absolute path starting with /
     * @returns File content string, or null if not found
     */
    get(path: string): Promise<string | null>;
    /**
     * Write content to a file path. Uses OPFS createWritable API.
     * @param path Absolute path starting with /
     * @param content File content to write
     */
    set(path: string, content: string): Promise<void>;
    /**
     * Delete a file. No-op if path does not exist.
     * @param path Absolute path starting with /
     */
    delete(path: string): Promise<void>;
    /**
     * List file paths, optionally filtered by prefix.
     * @param prefix Optional path prefix to filter results
     * @returns Array of absolute file paths
     */
    list(prefix?: string): Promise<string[]>;
    private walkDir;
    /**
     * Get multiple files by path in a single operation.
     * @param paths Array of absolute paths
     * @returns Record mapping each path to its content, or null if not found
     */
    batchGet(paths: string[]): Promise<Record<string, string | null>>;
    /**
     * Write multiple files in a single operation.
     * @param entries Record mapping absolute paths to content strings
     */
    batchSet(entries: Record<string, string>): Promise<void>;
    /**
     * Stream search results as an async iterable. Uses TextDecoderStream for streaming reads.
     * @param pattern String pattern to match against file content
     * @returns AsyncIterable yielding { path, line, content } objects
     */
    scanStream(pattern: string): AsyncIterable<{
        path: string;
        line: number;
        content: string;
    }>;
    /**
     * Search file contents for a pattern.
     * @param pattern String pattern to match against file content
     * @returns Array of match objects with path, line number, and content
     */
    scan(pattern: string): Promise<{
        path: string;
        line: number;
        content: string;
    }[]>;
    /**
     * Get file metadata. Uses OPFS File API for size/mtime.
     * @param path Absolute path starting with /
     * @returns Object with size, mtime, isDirectory, or null if not found
     */
    stat(path: string): Promise<{
        size: number;
        mtime: number;
        isDirectory: boolean;
        permissions: {
            read: boolean;
            write: boolean;
        };
    }>;
}

/**
 * Node.js filesystem backend for server-side and Electron main process use.
 * Uses dynamic imports so bundlers don't include fs/promises in browser builds.
 * @example
 * const fs = new AgenticFileSystem({ storage: new NodeFsBackend('/data') })
 */
declare class NodeFsBackend implements StorageBackend {
    private root;
    constructor(root: string);
    private abs;
    private validatePath;
    /**
     * Get file content by path.
     * @param path Absolute path starting with /
     * @returns File content string, or null if not found
     */
    get(p: string): Promise<string | null>;
    /**
     * Write content to a file path. Creates parent directories automatically.
     * @param path Absolute path starting with /
     * @param content File content to write
     */
    set(p: string, content: string): Promise<void>;
    /**
     * Delete a file. No-op if path does not exist.
     * @param path Absolute path starting with /
     */
    delete(p: string): Promise<void>;
    /**
     * List file paths, optionally filtered by prefix. Resolves symlinks and skips cycles.
     * @param prefix Optional path prefix to filter results
     * @returns Array of absolute file paths
     */
    list(prefix?: string): Promise<string[]>;
    private walk;
    /**
     * Stream search results as an async iterable, reading files line by line.
     * @param pattern String pattern to match against file content
     * @returns AsyncIterable yielding { path, line, content } objects
     */
    scanStream(pattern: string): AsyncIterable<{
        path: string;
        line: number;
        content: string;
    }>;
    /**
     * Search file contents for a pattern.
     * @param pattern String pattern to match against file content
     * @returns Array of match objects with path, line number, and content
     */
    scan(pattern: string): Promise<{
        path: string;
        line: number;
        content: string;
    }[]>;
    /**
     * Get multiple files by path in a single operation.
     * @param paths Array of absolute paths
     * @returns Record mapping each path to its content, or null if not found
     */
    batchGet(paths: string[]): Promise<Record<string, string | null>>;
    /**
     * Write multiple files in a single operation.
     * @param entries Record mapping absolute paths to content strings
     */
    batchSet(entries: Record<string, string>): Promise<void>;
    /**
     * Get file metadata including size, mtime, and permissions.
     * @param path Absolute path starting with /
     * @returns Object with size, mtime, isDirectory, permissions
     */
    stat(p: string): Promise<{
        size: number;
        mtime: number;
        isDirectory: boolean;
        permissions: {
            read: boolean;
            write: boolean;
        };
    }>;
}

declare class ShellFS {
    private fs;
    constructor(fs: AgenticFileSystem);
    exec(command: string): Promise<string>;
    private ls;
    private cat;
    private grep;
    private rm;
    private tree;
    private find;
}

interface ShellTool {
    name: string;
    description: string;
    input_schema: {
        type: 'object';
        properties: Record<string, {
            type: string;
            description: string;
        }>;
        required: string[];
    };
}
declare const shellFsTools: ShellTool[];

/**
 * In-memory Map-based storage backend. No persistence — useful for testing and ephemeral sessions.
 * @example
 * const fs = new AgenticFileSystem({ storage: new MemoryStorage() })
 */
declare class MemoryStorage implements StorageBackend {
    private store;
    private validatePath;
    /**
     * Get file content by path.
     * @param path Absolute path starting with /
     * @returns File content string, or null if not found
     */
    get(path: string): Promise<string | null>;
    /**
     * Write content to a file path.
     * @param path Absolute path starting with /
     * @param content File content to write
     */
    set(path: string, content: string): Promise<void>;
    /**
     * Delete a file. No-op if path does not exist.
     * @param path Absolute path starting with /
     */
    delete(path: string): Promise<void>;
    /**
     * List file paths, optionally filtered by prefix.
     * @param prefix Optional path prefix to filter results
     * @returns Array of absolute file paths
     */
    list(prefix?: string): Promise<string[]>;
    /**
     * Stream search results as an async iterable.
     * @param pattern String pattern to match against file content
     * @returns AsyncIterable yielding { path, line, content } objects
     */
    scanStream(pattern: string): AsyncIterable<{
        path: string;
        line: number;
        content: string;
    }>;
    /**
     * Search file contents for a pattern.
     * @param pattern String pattern to match against file content
     * @returns Array of match objects with path, line number, and content
     */
    scan(pattern: string): Promise<Array<{
        path: string;
        line: number;
        content: string;
    }>>;
    /**
     * Get multiple files by path in a single operation.
     * @param paths Array of absolute paths
     * @returns Record mapping each path to its content, or null if not found
     */
    batchGet(paths: string[]): Promise<Record<string, string | null>>;
    /**
     * Write multiple files in a single operation.
     * @param entries Record mapping absolute paths to content strings
     */
    batchSet(entries: Record<string, string>): Promise<void>;
    /**
     * Get file metadata.
     * @param path Absolute path starting with /
     * @returns Object with size, mtime, isDirectory, permissions, or null if not found
     */
    stat(path: string): Promise<{
        size: number;
        mtime: number;
        isDirectory: boolean;
        permissions: {
            read: boolean;
            write: boolean;
        };
    }>;
}

/**
 * Browser localStorage adapter. Synchronous storage exposed via async interface.
 * @example
 * const fs = new AgenticFileSystem({ storage: new LocalStorageBackend() })
 */
declare class LocalStorageBackend implements StorageBackend {
    private prefix;
    private normalizePath;
    private key;
    private storage;
    private validatePath;
    /**
     * Get file content by path. Uses localStorage with afs: prefix.
     * @param path Absolute path starting with /
     * @returns File content string, or null if not found
     */
    get(path: string): Promise<string | null>;
    /**
     * Write content to a file path.
     * @param path Absolute path starting with /
     * @param content File content to write
     */
    set(path: string, content: string): Promise<void>;
    /**
     * Delete a file. No-op if path does not exist.
     * @param path Absolute path starting with /
     */
    delete(path: string): Promise<void>;
    /**
     * List file paths, optionally filtered by prefix.
     * @param prefix Optional path prefix to filter results
     * @returns Array of absolute file paths
     */
    list(prefix?: string): Promise<string[]>;
    /**
     * Stream search results as an async iterable.
     * @param pattern String pattern to match against file content
     * @returns AsyncIterable yielding { path, line, content } objects
     */
    scanStream(pattern: string): AsyncIterable<{
        path: string;
        line: number;
        content: string;
    }>;
    /**
     * Search file contents for a pattern.
     * @param pattern String pattern to match against file content
     * @returns Array of match objects with path, line number, and content
     */
    scan(pattern: string): Promise<Array<{
        path: string;
        line: number;
        content: string;
    }>>;
    /**
     * Get multiple files by path in a single operation.
     * @param paths Array of absolute paths
     * @returns Record mapping each path to its content, or null if not found
     */
    batchGet(paths: string[]): Promise<Record<string, string | null>>;
    /**
     * Write multiple files in a single operation.
     * @param entries Record mapping absolute paths to content strings
     */
    batchSet(entries: Record<string, string>): Promise<void>;
    /**
     * Get file metadata.
     * @param path Absolute path starting with /
     * @returns Object with size, mtime, isDirectory, permissions, or null if not found
     */
    stat(path: string): Promise<{
        size: number;
        mtime: number;
        isDirectory: boolean;
        permissions: {
            read: boolean;
            write: boolean;
        };
    }>;
}

/**
 * SQLite backend adapter. Accepts a better-sqlite3 (Node.js) or sql.js (browser) database instance.
 * @example
 * import Database from 'better-sqlite3'
 * const fs = new AgenticFileSystem({ storage: new SQLiteBackend(new Database('data.db')) })
 */
declare class SQLiteBackend implements StorageBackend {
    private db;
    constructor(db: unknown);
    private norm;
    /**
     * Get file content by path. Uses SQL SELECT query.
     * @param path Absolute path starting with /
     * @returns File content string, or null if not found
     */
    get(path: string): Promise<string | null>;
    /**
     * Write content to a file path. Uses INSERT OR REPLACE with size and mtime.
     * @param path Absolute path starting with /
     * @param content File content to write
     */
    set(path: string, content: string): Promise<void>;
    /**
     * Delete a file. No-op if path does not exist.
     * @param path Absolute path starting with /
     */
    delete(path: string): Promise<void>;
    /**
     * List file paths, optionally filtered by prefix. Uses SQL LIKE for prefix matching.
     * @param prefix Optional path prefix to filter results
     * @returns Array of absolute file paths
     */
    list(prefix?: string): Promise<string[]>;
    /**
     * Stream search results as an async iterable. Loads all rows then yields matches.
     * @param pattern String pattern to match against file content
     * @returns AsyncIterable yielding { path, line, content } objects
     */
    scanStream(pattern: string): AsyncIterable<{
        path: string;
        line: number;
        content: string;
    }>;
    /**
     * Search file contents for a pattern.
     * @param pattern String pattern to match against file content
     * @returns Array of match objects with path, line number, and content
     */
    scan(pattern: string): Promise<{
        path: string;
        line: number;
        content: string;
    }[]>;
    /**
     * Get multiple files by path in a single operation.
     * @param paths Array of absolute paths
     * @returns Record mapping each path to its content, or null if not found
     */
    batchGet(paths: string[]): Promise<Record<string, string | null>>;
    /**
     * Write multiple files in a single operation. Uses BEGIN/COMMIT transaction.
     * @param entries Record mapping absolute paths to content strings
     */
    batchSet(entries: Record<string, string>): Promise<void>;
    /**
     * Get file metadata. Reads size and mtime from the files table.
     * @param path Absolute path starting with /
     * @returns Object with size, mtime, isDirectory, or null if not found
     */
    stat(path: string): Promise<{
        size: number;
        mtime: number;
        isDirectory: boolean;
        permissions: {
            read: boolean;
            write: boolean;
        };
    }>;
}

declare class TfIdfEmbedBackend implements EmbedBackend {
    private vocab;
    private docs;
    private idf;
    /**
     * Build TF-IDF index from all documents in storage.
     */
    index(storage: StorageBackend): Promise<void>;
    /**
     * Encode text into a TF vector over the vocabulary.
     */
    encode(text: string): Promise<number[]>;
    /**
     * Search for documents similar to the given embedding.
     */
    search(embedding: number[], topK?: number): Promise<Array<{
        path: string;
        score: number;
    }>>;
    /**
     * Tokenize text into lowercase words.
     */
    private tokenize;
    /**
     * Compute term frequency vector (normalized).
     */
    private computeTf;
    /**
     * Compute TF-IDF vector for a document.
     */
    private computeTfIdf;
    /**
     * Compute cosine similarity between two vectors.
     */
    private cosine;
}

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
declare function createBackend(options?: {
    rootDir?: string;
    sqliteDb?: unknown;
    sqlitePath?: string;
}): Promise<StorageBackend>;
declare const createDefaultBackend: typeof createBackend;
declare const createAutoBackend: typeof createBackend;

export { AgenticFileSystem, AgenticStoreBackend, type EmbedBackend, type FileResult, type FileSystemConfig, type GrepResult, IOError, LocalStorageBackend, type LsResult, MemoryStorage, NodeFsBackend, NotFoundError, OPFSBackend, type Permission, PermissionDeniedError, SQLiteBackend, ShellFS, type ShellTool, type StorageBackend, TfIdfEmbedBackend, type TreeNode, createAutoBackend, createBackend, createDefaultBackend, shellFsTools };
