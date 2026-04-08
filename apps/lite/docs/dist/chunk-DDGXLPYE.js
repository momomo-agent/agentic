import {
  IOError,
  NotFoundError
} from "./chunk-JYFXRBIL.js";

// ../agentic-filesystem/dist/chunk-7I3CNAXJ.js
var MemoryStorage = class {
  store = /* @__PURE__ */ new Map();
  validatePath(path) {
    if (path === "") throw new IOError("Path cannot be empty");
  }
  /**
   * Get file content by path.
   * @param path Absolute path starting with /
   * @returns File content string, or null if not found
   */
  async get(path) {
    this.validatePath(path);
    return this.store.get(path) ?? null;
  }
  /**
   * Write content to a file path.
   * @param path Absolute path starting with /
   * @param content File content to write
   */
  async set(path, content) {
    this.validatePath(path);
    this.store.set(path, content);
  }
  /**
   * Delete a file. No-op if path does not exist.
   * @param path Absolute path starting with /
   */
  async delete(path) {
    this.validatePath(path);
    this.store.delete(path);
  }
  /**
   * List file paths, optionally filtered by prefix.
   * @param prefix Optional path prefix to filter results
   * @returns Array of absolute file paths
   */
  async list(prefix) {
    const keys = Array.from(this.store.keys()).map((k) => k.startsWith("/") ? k : "/" + k);
    return prefix ? keys.filter((k) => k.startsWith(prefix)) : keys;
  }
  /**
   * Stream search results as an async iterable.
   * @param pattern String pattern to match against file content
   * @returns AsyncIterable yielding { path, line, content } objects
   */
  async *scanStream(pattern) {
    for (const [path, value] of this.store) {
      const lines = value.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(pattern)) yield { path, line: i + 1, content: lines[i] };
      }
    }
  }
  /**
   * Search file contents for a pattern.
   * @param pattern String pattern to match against file content
   * @returns Array of match objects with path, line number, and content
   */
  async scan(pattern) {
    const results = [];
    for await (const r of this.scanStream(pattern)) results.push(r);
    return results;
  }
  /**
   * Get multiple files by path in a single operation.
   * @param paths Array of absolute paths
   * @returns Record mapping each path to its content, or null if not found
   */
  async batchGet(paths) {
    return Object.fromEntries(paths.map((p) => [p, this.store.get(p) ?? null]));
  }
  /**
   * Write multiple files in a single operation.
   * @param entries Record mapping absolute paths to content strings
   */
  async batchSet(entries) {
    for (const [p, c] of Object.entries(entries)) this.store.set(p, c);
  }
  /**
   * Get file metadata.
   * @param path Absolute path starting with /
   * @returns Object with size, mtime, isDirectory, permissions, or null if not found
   */
  async stat(path) {
    this.validatePath(path);
    const value = this.store.get(path);
    if (value === void 0) throw new NotFoundError(path);
    return { size: value.length, mtime: 0, isDirectory: false, permissions: { read: true, write: true } };
  }
};

export {
  MemoryStorage
};
