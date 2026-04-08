import {
  IOError,
  NotFoundError
} from "./chunk-JYFXRBIL.js";

// ../agentic-filesystem/dist/chunk-34KBWFCS.js
var fsp = () => import("fs/promises");
var fs = () => import("fs");
var path = () => import("path");
var readline = () => import("readline");
var NodeFsBackend = class {
  constructor(root) {
    this.root = root;
  }
  root;
  async abs(p) {
    const { join } = await path();
    return join(this.root, p.replace(/^\//, ""));
  }
  validatePath(p) {
    if (p === "") throw new IOError("Path cannot be empty");
  }
  /**
   * Get file content by path.
   * @param path Absolute path starting with /
   * @returns File content string, or null if not found
   */
  async get(p) {
    this.validatePath(p);
    const { readFile } = await fsp();
    try {
      return await readFile(await this.abs(p), "utf-8");
    } catch (e) {
      if (e.code === "ENOENT") return null;
      throw new IOError(String(e));
    }
  }
  /**
   * Write content to a file path. Creates parent directories automatically.
   * @param path Absolute path starting with /
   * @param content File content to write
   */
  async set(p, content) {
    this.validatePath(p);
    const { writeFile, mkdir } = await fsp();
    const { dirname } = await path();
    const abs = await this.abs(p);
    try {
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, content, "utf-8");
    } catch (e) {
      throw new IOError(String(e));
    }
  }
  /**
   * Delete a file. No-op if path does not exist.
   * @param path Absolute path starting with /
   */
  async delete(p) {
    this.validatePath(p);
    const { unlink } = await fsp();
    try {
      await unlink(await this.abs(p));
    } catch (e) {
      if (e.code !== "ENOENT") throw new IOError(String(e));
    }
  }
  /**
   * List file paths, optionally filtered by prefix. Resolves symlinks and skips cycles.
   * @param prefix Optional path prefix to filter results
   * @returns Array of absolute file paths
   */
  async list(prefix) {
    const { relative } = await path();
    const results = [];
    await this.walk(this.root, results);
    const rel = results.map((p) => "/" + relative(this.root, p));
    return prefix ? rel.filter((p) => p.startsWith(prefix)) : rel;
  }
  async walk(dir, out, visited = /* @__PURE__ */ new Set()) {
    const { existsSync } = await fs();
    const { readdir, realpath, stat } = await fsp();
    const { join } = await path();
    if (!existsSync(dir)) return;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isSymbolicLink()) {
        const target = await realpath(full).catch(() => null);
        if (!target || visited.has(target)) continue;
        visited.add(target);
        const s = await stat(target).catch(() => null);
        if (!s) continue;
        if (s.isDirectory()) await this.walk(target, out, visited);
        else out.push(full);
      } else if (e.isDirectory()) {
        await this.walk(full, out, visited);
      } else {
        out.push(full);
      }
    }
  }
  /**
   * Stream search results as an async iterable, reading files line by line.
   * @param pattern String pattern to match against file content
   * @returns AsyncIterable yielding { path, line, content } objects
   */
  async *scanStream(pattern) {
    const { createReadStream } = await fs();
    const { createInterface } = await readline();
    const paths = await this.list();
    for (const p of paths) {
      try {
        const rl = createInterface({ input: createReadStream(await this.abs(p), "utf-8"), crlfDelay: Infinity });
        let lineNum = 0;
        for await (const line of rl) {
          lineNum++;
          if (line.includes(pattern)) yield { path: p, line: lineNum, content: line };
        }
      } catch (e) {
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
   * Get file metadata including size, mtime, and permissions.
   * @param path Absolute path starting with /
   * @returns Object with size, mtime, isDirectory, permissions
   */
  async stat(p) {
    this.validatePath(p);
    const { stat } = await fsp();
    try {
      const s = await stat(await this.abs(p));
      return {
        size: s.size,
        mtime: s.mtimeMs,
        isDirectory: s.isDirectory(),
        permissions: { read: !!(s.mode & 256), write: !!(s.mode & 128) }
      };
    } catch (e) {
      if (e.code === "ENOENT") throw new NotFoundError(p);
      throw new IOError(String(e));
    }
  }
};

export {
  NodeFsBackend
};
