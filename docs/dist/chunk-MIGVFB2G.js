import {
  IOError,
  NotFoundError
} from "./chunk-JYFXRBIL.js";

// ../agentic-filesystem/dist/chunk-BQCJBAMM.js
var AgenticStoreBackend = class {
  constructor(store) {
    this.store = store;
  }
  store;
  normPath(path) {
    return path.startsWith("/") ? path : "/" + path;
  }
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
    try {
      return await this.store.get(this.normPath(path)) ?? null;
    } catch (e) {
      throw new IOError(String(e));
    }
  }
  /**
   * Write content to a file path. Stores mtime metadata via \x00mtime key suffix.
   * @param path Absolute path starting with /
   * @param content File content to write
   */
  async set(path, content) {
    this.validatePath(path);
    const p = this.normPath(path);
    try {
      await this.store.set(p, content);
      await this.store.set(p + "\0mtime", String(Date.now()));
    } catch (e) {
      throw new IOError(String(e));
    }
  }
  /**
   * Delete a file. No-op if path does not exist.
   * @param path Absolute path starting with /
   */
  async delete(path) {
    this.validatePath(path);
    const p = this.normPath(path);
    try {
      await this.store.delete(p);
      await this.store.delete(p + "\0mtime");
    } catch (e) {
      throw new IOError(String(e));
    }
  }
  /**
   * List file paths, optionally filtered by prefix.
   * @param prefix Optional path prefix to filter results
   * @returns Array of absolute file paths
   */
  async list(prefix) {
    try {
      const keys = await this.store.keys();
      const normalized = keys.filter((k) => !k.includes("\0")).map((k) => k.startsWith("/") ? k : "/" + k);
      if (!prefix) return normalized;
      return normalized.filter((k) => k.startsWith(prefix));
    } catch (e) {
      throw new IOError(String(e));
    }
  }
  /**
   * Get multiple files by path in a single operation.
   * @param paths Array of absolute paths
   * @returns Record mapping each path to its content, or null if not found
   */
  async batchGet(paths) {
    const results = await Promise.all(paths.map((p) => this.get(p)));
    return Object.fromEntries(paths.map((p, i) => [p, results[i]]));
  }
  /**
   * Write multiple files in a single operation.
   * @param entries Record mapping absolute paths to content strings
   */
  async batchSet(entries) {
    await Promise.all(Object.entries(entries).map(([p, v]) => this.set(p, v)));
  }
  /**
   * Stream search results as an async iterable.
   * @param pattern String pattern to match against file content
   * @returns AsyncIterable yielding { path, line, content } objects
   */
  async *scanStream(pattern) {
    for (const key of (await this.store.keys()).filter((k) => !k.includes("\0"))) {
      const normalized = key.startsWith("/") ? key : "/" + key;
      const value = await this.store.get(key);
      if (typeof value !== "string") continue;
      const lines = value.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(pattern)) yield { path: normalized, line: i + 1, content: lines[i] };
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
   * Get file metadata. Uses \x00mtime key suffix for mtime storage.
   * @param path Absolute path starting with /
   * @returns Object with size, mtime, isDirectory, or null if not found
   */
  async stat(path) {
    this.validatePath(path);
    try {
      const p = this.normPath(path);
      const value = await this.store.get(p);
      if (value == null) throw new NotFoundError(path);
      const mtimeRaw = await this.store.get(p + "\0mtime");
      const mtime = mtimeRaw ? Number(mtimeRaw) || 0 : 0;
      return { size: new Blob([String(value)]).size, mtime, isDirectory: false, permissions: { read: true, write: true } };
    } catch (e) {
      if (e instanceof NotFoundError || e instanceof IOError) throw e;
      throw new IOError(String(e));
    }
  }
};

export {
  AgenticStoreBackend
};
