import {
  AgenticStoreBackend
} from "./chunk-BQCJBAMM.js";
import {
  OPFSBackend
} from "./chunk-R5UJRSQU.js";
import {
  NodeFsBackend
} from "./chunk-34KBWFCS.js";
import {
  MemoryStorage
} from "./chunk-7I3CNAXJ.js";
import {
  SQLiteBackend
} from "./chunk-KCDORWBP.js";
import {
  IOError,
  NotFoundError,
  PermissionDeniedError
} from "./chunk-AP75BLWF.js";

// src/filesystem.ts
var AgenticFileSystem = class {
  storage;
  embed;
  readOnly;
  permissions;
  constructor(config) {
    this.storage = config.storage;
    this.embed = config.embed;
    this.readOnly = config.readOnly ?? false;
    this.permissions = new Map(Object.entries(config.permissions ?? {}));
  }
  setPermission(path, perm) {
    const normalized = path.startsWith("/") ? path : "/" + path;
    this.permissions.set(normalized, perm);
  }
  checkPermission(path, op) {
    const normalized = path.startsWith("/") ? path : "/" + path;
    if (this.permissions.has(normalized)) {
      if (!this.permissions.get(normalized)[op]) throw new PermissionDeniedError(path);
      return;
    }
    let best;
    let bestLen = -1;
    for (const [key, perm] of this.permissions) {
      const prefix = key.endsWith("/") ? key : key + "/";
      if ((normalized === key || normalized.startsWith(prefix)) && key.length > bestLen) {
        best = perm;
        bestLen = key.length;
      }
    }
    if (best && !best[op]) throw new PermissionDeniedError(path);
  }
  // ── Core file operations ──
  /**
   * Read file contents at path.
   * @param path Absolute path starting with /
   * @returns FileResult with content, or error message if not found or permission denied
   */
  async read(path) {
    try {
      this.checkPermission(path, "read");
      const content = await this.storage.get(path);
      if (content === null) throw new NotFoundError(path);
      return { path, content };
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof PermissionDeniedError) {
        return { path, error: err.message };
      }
      return { path, error: new IOError(String(err)).message };
    }
  }
  /**
   * Write content to path. Returns error if readOnly or permission denied.
   * @param path Absolute path starting with /
   * @param content String content to write
   */
  async write(path, content) {
    if (this.readOnly) return { path, error: new PermissionDeniedError("Read-only file system").message };
    try {
      this.checkPermission(path, "write");
      await this.storage.set(path, content);
      return { path };
    } catch (err) {
      if (err instanceof PermissionDeniedError) return { path, error: err.message };
      return { path, error: new IOError(String(err)).message };
    }
  }
  /**
   * Delete file at path. Returns error if readOnly or permission denied.
   * @param path Absolute path starting with /
   */
  async delete(path) {
    if (this.readOnly) return { path, error: new PermissionDeniedError("Read-only file system").message };
    try {
      this.checkPermission(path, "write");
      await this.storage.delete(path);
      return { path };
    } catch (err) {
      if (err instanceof PermissionDeniedError) return { path, error: err.message };
      return { path, error: new IOError(String(err)).message };
    }
  }
  /** List files under prefix. Returns LsResult[] with name, type, size, mtime. */
  async ls(prefix) {
    try {
      const paths = await this.storage.list(prefix);
      const seen = /* @__PURE__ */ new Set();
      const results = [];
      for (const p of paths) {
        const rel = prefix ? p.slice(prefix.endsWith("/") ? prefix.length : prefix.length + 1) : p.replace(/^\//, "");
        const parts = rel.split("/");
        if (parts.length > 1) {
          const dirName = (prefix ? prefix.replace(/\/?$/, "/") : "/") + parts[0];
          if (!seen.has(dirName)) {
            seen.add(dirName);
            results.push({ name: dirName, type: "dir" });
          }
        } else {
          let meta = null;
          try {
            meta = await this.storage.stat?.(p) ?? null;
          } catch {
          }
          results.push({ name: p, type: "file", size: meta?.size, mtime: meta?.mtime });
        }
      }
      return results;
    } catch (err) {
      new IOError(String(err));
      return [];
    }
  }
  /** Return recursive directory tree under prefix (default: '/'). */
  async tree(prefix) {
    try {
      const root = prefix ?? "/";
      const paths = await this.storage.list(root);
      const nodes = /* @__PURE__ */ new Map();
      const getOrCreateDir = (dirPath) => {
        if (!nodes.has(dirPath)) {
          nodes.set(dirPath, {
            name: dirPath.split("/").filter(Boolean).pop() ?? dirPath,
            path: dirPath,
            type: "dir",
            children: []
          });
        }
        return nodes.get(dirPath);
      };
      for (const p of paths) {
        let meta = null;
        try {
          meta = await this.storage.stat?.(p) ?? null;
        } catch {
        }
        const fileNode = {
          name: p.split("/").filter(Boolean).pop() ?? p,
          path: p,
          type: "file",
          size: meta?.size,
          mtime: meta?.mtime
        };
        const parts = p.split("/").filter(Boolean);
        const rootParts = root.split("/").filter(Boolean);
        const relativeParts = parts.slice(rootParts.length);
        if (relativeParts.length <= 1) {
          nodes.set(p, fileNode);
        } else {
          let currentPath = "/" + rootParts.join("/");
          for (let i = 0; i < relativeParts.length - 1; i++) {
            const parentPath2 = currentPath;
            currentPath = currentPath === "/" ? "/" + relativeParts[i] : currentPath + "/" + relativeParts[i];
            const dir = getOrCreateDir(currentPath);
            const parent2 = parentPath2 === root ? null : getOrCreateDir(parentPath2);
            if (parent2 && !parent2.children.find((c) => c.path === currentPath)) {
              parent2.children.push(dir);
            }
          }
          const parentPath = currentPath;
          const parent = parentPath === root ? null : getOrCreateDir(parentPath);
          if (parent) {
            if (!parent.children.find((c) => c.path === p)) parent.children.push(fileNode);
          } else {
            nodes.set(p, fileNode);
          }
        }
      }
      const rootNorm = root.endsWith("/") ? root.slice(0, -1) : root;
      return Array.from(nodes.values()).filter((n) => {
        const parent = n.path.substring(0, n.path.lastIndexOf("/")) || "/";
        return parent === rootNorm || parent === rootNorm + "/";
      });
    } catch {
      return [];
    }
  }
  // ── Batch & streaming operations ──
  /**
   * Batch-get multiple files by path.
   * @param paths Array of absolute file paths
   * @returns Record mapping each path to its content, or null if not found
   */
  async batchGet(paths) {
    return this.storage.batchGet(paths);
  }
  /**
   * Batch-set multiple files at once. Throws if readOnly.
   * @param entries Record mapping absolute file paths to content strings
   */
  async batchSet(entries) {
    if (this.readOnly) throw new PermissionDeniedError("Read-only file system");
    return this.storage.batchSet(entries);
  }
  /**
   * Stream grep results as an async iterable.
   * @param pattern Search pattern (matched against file content)
   * @returns AsyncIterable yielding { path, line, content } match objects
   */
  scanStream(pattern) {
    return this.storage.scanStream(pattern);
  }
  // ── Smart grep with multiple strategies ──
  /** Search files for pattern. Use semantic:true for embedding-based search. */
  async grep(pattern, options) {
    if (options?.semantic && this.embed) {
      return await this.semanticGrep(pattern);
    }
    return await this.literalGrep(pattern);
  }
  async literalGrep(pattern) {
    try {
      const results = await this.storage.scan(pattern);
      return results.map(({ path, line, content }) => ({
        path,
        line,
        content,
        match: pattern
      }));
    } catch (err) {
      new IOError(String(err));
      return [];
    }
  }
  async semanticGrep(query) {
    if (!this.embed) return [];
    try {
      const embedding = await this.embed.encode(query);
      const results = await this.embed.search(embedding, 10);
      const matches = [];
      for (const { path, score } of results) {
        const content = await this.storage.get(path);
        if (content) {
          const firstLine = content.split("\n")[0];
          matches.push({
            path,
            line: 1,
            content: firstLine,
            match: `(semantic match, score: ${score.toFixed(2)})`
          });
        }
      }
      return matches;
    } catch (err) {
      new IOError(String(err));
      return [];
    }
  }
  // ── Tool definitions for AI agents ──
  /** Return tool definitions for AI agent tool-use integration. */
  getToolDefinitions() {
    return [
      {
        name: "file_read",
        description: "Read the contents of a file",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path to read" }
          },
          required: ["path"]
        }
      },
      {
        name: "file_write",
        description: "Write content to a file",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path to write" },
            content: { type: "string", description: "Content to write" }
          },
          required: ["path", "content"]
        }
      },
      {
        name: "grep",
        description: "Search for pattern in files (supports literal and semantic search)",
        parameters: {
          type: "object",
          properties: {
            pattern: { type: "string", description: "Search pattern or query" },
            semantic: { type: "boolean", description: "Use semantic search instead of literal match" }
          },
          required: ["pattern"]
        }
      },
      {
        name: "ls",
        description: "List files in directory",
        parameters: {
          type: "object",
          properties: {
            prefix: { type: "string", description: "Directory prefix to list" }
          }
        }
      },
      {
        name: "file_delete",
        description: "Delete a file at the specified path",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path to delete" }
          },
          required: ["path"]
        }
      },
      {
        name: "file_tree",
        description: "Get recursive directory tree structure with file metadata",
        parameters: {
          type: "object",
          properties: {
            prefix: { type: "string", description: "Root path to display tree from (default: /)" }
          }
        }
      },
      {
        name: "batch_get",
        description: "Read multiple files at once by path",
        parameters: {
          type: "object",
          properties: {
            paths: {
              type: "array",
              items: { type: "string" },
              description: "Array of absolute file paths to read"
            }
          },
          required: ["paths"]
        }
      },
      {
        name: "batch_set",
        description: "Write multiple files at once",
        parameters: {
          type: "object",
          properties: {
            entries: {
              type: "object",
              additionalProperties: { type: "string" },
              description: "Map of absolute file paths to content strings"
            }
          },
          required: ["entries"]
        }
      },
      {
        name: "grep_stream",
        description: "Stream grep results for large result sets",
        parameters: {
          type: "object",
          properties: {
            pattern: {
              type: "string",
              description: "Search pattern to match against file content"
            }
          },
          required: ["pattern"]
        }
      }
    ];
  }
  /** Execute a named tool with input params. Used by AI agent runtimes. */
  async executeTool(name, input) {
    switch (name) {
      case "file_read":
        return await this.read(String(input.path ?? ""));
      case "file_write":
        return await this.write(String(input.path ?? ""), String(input.content ?? ""));
      case "grep":
        return await this.grep(String(input.pattern ?? ""), { semantic: Boolean(input.semantic) });
      case "ls":
        return await this.ls(input.prefix ? String(input.prefix) : void 0);
      case "file_delete":
        return await this.delete(String(input.path ?? ""));
      case "file_tree":
        return await this.tree(input.prefix ? String(input.prefix) : void 0);
      case "batch_get":
        return await this.batchGet(input.paths);
      case "batch_set":
        return await this.batchSet(input.entries);
      case "grep_stream": {
        const results = [];
        for await (const r of this.scanStream(input.pattern)) {
          results.push(r);
        }
        return results;
      }
      default:
        return { error: "Unknown tool" };
    }
  }
};

// src/shell.ts
var ShellFS = class {
  constructor(fs) {
    this.fs = fs;
  }
  fs;
  async exec(command) {
    const [cmd, ...args] = command.trim().split(/\s+/);
    switch (cmd) {
      case "ls":
        return this.ls(args[0] || "/");
      case "cat":
        return this.cat(args[0]);
      case "grep":
        return this.grep(args);
      case "find":
        return this.find(args);
      case "rm":
        return this.rm(args[0]);
      case "tree":
        return this.tree(args[0]);
      case "pwd":
        return "/";
      default:
        return `${cmd}: command not found`;
    }
  }
  async ls(path) {
    const entries = await this.fs.ls(path === "/" ? void 0 : path);
    if (!entries.length) return "";
    return entries.map((e) => e.name).join("\n");
  }
  async cat(path) {
    if (!path) return "cat: missing operand";
    const result = await this.fs.read(path);
    return result.error ? `cat: ${path}: ${result.error}` : result.content ?? "";
  }
  async grep(args) {
    const rIdx = args.indexOf("-r");
    const cleanArgs = args.filter((a) => a !== "-r");
    const [pattern, path] = cleanArgs;
    if (!pattern) return "grep: missing pattern";
    const results = await this.fs.grep(pattern);
    const filtered = path ? results.filter((r) => r.path.startsWith(path)) : results;
    return filtered.map((r) => `${r.path}:${r.line}: ${r.content}`).join("\n");
  }
  async rm(path) {
    if (!path) return "rm: missing operand";
    await this.fs.delete(path);
    return "";
  }
  async tree(path) {
    const nodes = await this.fs.tree(path ?? "/");
    const lines = [path ?? "/"];
    const render = (nodes2, depth) => {
      for (const n of nodes2) {
        lines.push("  ".repeat(depth) + (n.type === "dir" ? "\u{1F4C1} " : "") + n.name);
        if (n.children?.length) render(n.children, depth + 1);
      }
    };
    render(nodes, 1);
    return lines.join("\n");
  }
  async find(args) {
    const nameIdx = args.indexOf("-name");
    const namePattern = nameIdx !== -1 ? args[nameIdx + 1] : void 0;
    const basePath = args[0]?.startsWith("-") ? void 0 : args[0];
    const entries = await this.fs.ls(basePath);
    const paths = entries.map((e) => e.name);
    if (!namePattern) return paths.join("\n");
    const regex = new RegExp(namePattern.replace("*", ".*").replace("?", "."));
    return paths.filter((p) => regex.test(p.split("/").pop() ?? "")).join("\n");
  }
};

// src/shell-tools.ts
var shellFsTools = [
  {
    name: "shell_cat",
    description: "Read full content of a file",
    input_schema: {
      type: "object",
      properties: { path: { type: "string", description: "File path to read" } },
      required: ["path"]
    }
  },
  {
    name: "shell_head",
    description: "Read first N lines of a file",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path to read" },
        lines: { type: "number", description: "Number of lines (default 10)" }
      },
      required: ["path"]
    }
  },
  {
    name: "shell_tail",
    description: "Read last N lines of a file",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path to read" },
        lines: { type: "number", description: "Number of lines (default 10)" }
      },
      required: ["path"]
    }
  },
  {
    name: "shell_find",
    description: "List files, optionally filtered by name pattern",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Base path to search" },
        name: { type: "string", description: "Name pattern to filter by" }
      },
      required: []
    }
  },
  {
    name: "shell_delete",
    description: "Delete a file at the specified path",
    input_schema: {
      type: "object",
      properties: { path: { type: "string", description: "File path to delete" } },
      required: ["path"]
    }
  },
  {
    name: "shell_tree",
    description: "Display recursive directory tree structure",
    input_schema: {
      type: "object",
      properties: { path: { type: "string", description: "Root path to display tree from (default: /)" } },
      required: []
    }
  }
];

// src/backends/local-storage.ts
var LocalStorageBackend = class {
  prefix = "afs:";
  normalizePath(path) {
    return path.startsWith("/") ? path : "/" + path;
  }
  key(path) {
    return this.prefix + this.normalizePath(path);
  }
  storage() {
    if (typeof localStorage === "undefined") throw new IOError("localStorage not available");
    return localStorage;
  }
  validatePath(path) {
    if (path === "") throw new IOError("Path cannot be empty");
  }
  /**
   * Get file content by path. Uses localStorage with afs: prefix.
   * @param path Absolute path starting with /
   * @returns File content string, or null if not found
   */
  async get(path) {
    this.validatePath(path);
    try {
      return this.storage().getItem(this.key(path)) ?? null;
    } catch (e) {
      if (e instanceof IOError) throw e;
      throw new IOError(`Failed to read "${path}": ${String(e)}`);
    }
  }
  /**
   * Write content to a file path.
   * @param path Absolute path starting with /
   * @param content File content to write
   */
  async set(path, content) {
    this.validatePath(path);
    try {
      this.storage().setItem(this.key(path), content);
    } catch (e) {
      if (e instanceof IOError) throw e;
      throw new IOError(`Failed to write "${path}": ${String(e)}`);
    }
  }
  /**
   * Delete a file. No-op if path does not exist.
   * @param path Absolute path starting with /
   */
  async delete(path) {
    this.validatePath(path);
    try {
      this.storage().removeItem(this.key(path));
    } catch (e) {
      if (e instanceof IOError) throw e;
      throw new IOError(`Failed to delete "${path}": ${String(e)}`);
    }
  }
  /**
   * List file paths, optionally filtered by prefix.
   * @param prefix Optional path prefix to filter results
   * @returns Array of absolute file paths
   */
  async list(prefix) {
    try {
      const s = this.storage();
      const paths = [];
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (!k.startsWith(this.prefix)) continue;
        const path = k.slice(this.prefix.length);
        if (!prefix || path.startsWith(prefix)) paths.push(path);
      }
      return paths;
    } catch (e) {
      if (e instanceof IOError) throw e;
      throw new IOError(`Failed to list: ${String(e)}`);
    }
  }
  /**
   * Stream search results as an async iterable.
   * @param pattern String pattern to match against file content
   * @returns AsyncIterable yielding { path, line, content } objects
   */
  async *scanStream(pattern) {
    for (const path of await this.list()) {
      const text = await this.get(path);
      if (!text) continue;
      const lines = text.split("\n");
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
    const entries = await Promise.all(paths.map(async (p) => [p, await this.get(p)]));
    return Object.fromEntries(entries);
  }
  /**
   * Write multiple files in a single operation.
   * @param entries Record mapping absolute paths to content strings
   */
  async batchSet(entries) {
    await Promise.all(Object.entries(entries).map(([p, c]) => this.set(p, c)));
  }
  /**
   * Get file metadata.
   * @param path Absolute path starting with /
   * @returns Object with size, mtime, isDirectory, permissions, or null if not found
   */
  async stat(path) {
    this.validatePath(path);
    const content = this.storage().getItem(this.key(path));
    if (content === null) throw new NotFoundError(path);
    return { size: content.length, mtime: 0, isDirectory: false, permissions: { read: true, write: true } };
  }
};

// src/backends/tfidf-embed.ts
var TfIdfEmbedBackend = class {
  vocab = [];
  docs = /* @__PURE__ */ new Map();
  idf = /* @__PURE__ */ new Map();
  /**
   * Build TF-IDF index from all documents in storage.
   */
  async index(storage) {
    const paths = await storage.list();
    if (paths.length === 0) {
      this.vocab = [];
      this.docs.clear();
      this.idf.clear();
      return;
    }
    const docTokens = /* @__PURE__ */ new Map();
    const termDocCount = /* @__PURE__ */ new Map();
    for (const path of paths) {
      const content = await storage.get(path);
      if (!content) continue;
      const tokens = this.tokenize(content);
      docTokens.set(path, tokens);
      const uniqueTerms = new Set(tokens);
      for (const term of uniqueTerms) {
        termDocCount.set(term, (termDocCount.get(term) || 0) + 1);
      }
    }
    this.vocab = Array.from(termDocCount.keys()).sort();
    const numDocs = docTokens.size;
    for (const term of this.vocab) {
      const docFreq = termDocCount.get(term) || 0;
      this.idf.set(term, Math.log(numDocs / docFreq));
    }
    for (const [path, tokens] of docTokens) {
      const vector = this.computeTfIdf(tokens);
      this.docs.set(path, vector);
    }
  }
  /**
   * Encode text into a TF vector over the vocabulary.
   */
  async encode(text) {
    const tokens = this.tokenize(text);
    return this.computeTf(tokens);
  }
  /**
   * Search for documents similar to the given embedding.
   */
  async search(embedding, topK = 5) {
    if (this.docs.size === 0) {
      return [];
    }
    const results = [];
    for (const [path, docVector] of this.docs) {
      const score = this.cosine(embedding, docVector);
      results.push({ path, score });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }
  /**
   * Tokenize text into lowercase words.
   */
  tokenize(text) {
    return text.toLowerCase().split(/\W+/).filter(Boolean);
  }
  /**
   * Compute term frequency vector (normalized).
   */
  computeTf(tokens) {
    const termCount = /* @__PURE__ */ new Map();
    for (const token of tokens) {
      termCount.set(token, (termCount.get(token) || 0) + 1);
    }
    const vector = new Array(this.vocab.length).fill(0);
    const totalTerms = tokens.length || 1;
    for (let i = 0; i < this.vocab.length; i++) {
      const term = this.vocab[i];
      const count = termCount.get(term) || 0;
      vector[i] = count / totalTerms;
    }
    return vector;
  }
  /**
   * Compute TF-IDF vector for a document.
   */
  computeTfIdf(tokens) {
    const tf = this.computeTf(tokens);
    const tfidf = new Array(this.vocab.length);
    for (let i = 0; i < this.vocab.length; i++) {
      const term = this.vocab[i];
      const idfValue = this.idf.get(term) || 0;
      tfidf[i] = tf[i] * idfValue;
    }
    return tfidf;
  }
  /**
   * Compute cosine similarity between two vectors.
   */
  cosine(a, b) {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
  }
};

// src/index.ts
async function createBackend(options) {
  if (options?.sqliteDb) {
    const { SQLiteBackend: SQLiteBackend2 } = await import("./sqlite-G2GMUA3A.js");
    return new SQLiteBackend2(options.sqliteDb);
  }
  if (typeof process !== "undefined" && process.versions?.node) {
    try {
      const Database = (await import("better-sqlite3")).default;
      const { join } = await import("path");
      const dbPath = options?.sqlitePath ?? join(process.cwd(), ".agentic-fs.db");
      const { SQLiteBackend: SQLiteBackend2 } = await import("./sqlite-G2GMUA3A.js");
      return new SQLiteBackend2(new Database(dbPath));
    } catch {
    }
    const { NodeFsBackend: NodeFsBackend2 } = await import("./node-fs-IXXL3KQ2.js");
    return new NodeFsBackend2(options?.rootDir ?? process.cwd());
  }
  if (typeof navigator !== "undefined" && "storage" in navigator) {
    try {
      await navigator.storage.getDirectory();
      const { OPFSBackend: OPFSBackend2 } = await import("./opfs-XWVG4ZXR.js");
      return new OPFSBackend2();
    } catch {
    }
  }
  if (typeof indexedDB !== "undefined") {
    const { AgenticStoreBackend: AgenticStoreBackend2 } = await import("./agentic-store-YOTIMHOA.js");
    class IDBStore {
      dbp;
      constructor() {
        this.dbp = new Promise((res, rej) => {
          const req = indexedDB.open("agentic-fs", 1);
          req.onupgradeneeded = () => req.result.createObjectStore("kv");
          req.onsuccess = () => res(req.result);
          req.onerror = () => rej(req.error);
        });
      }
      tx(mode) {
        return this.dbp.then((db) => db.transaction("kv", mode).objectStore("kv"));
      }
      wrap(req) {
        return new Promise((res, rej) => {
          req.onsuccess = () => res(req.result);
          req.onerror = () => rej(req.error);
        });
      }
      async get(key) {
        return this.wrap((await this.tx("readonly")).get(key));
      }
      async set(key, value) {
        await this.wrap((await this.tx("readwrite")).put(value, key));
      }
      async delete(key) {
        await this.wrap((await this.tx("readwrite")).delete(key));
      }
      async keys() {
        return this.wrap((await this.tx("readonly")).getAllKeys());
      }
      async has(key) {
        return await this.get(key) != null;
      }
    }
    return new AgenticStoreBackend2(new IDBStore());
  }
  const { MemoryStorage: MemoryStorage2 } = await import("./memory-ESE6CCYA.js");
  return new MemoryStorage2();
}
var createDefaultBackend = createBackend;
var createAutoBackend = createBackend;
export {
  AgenticFileSystem,
  AgenticStoreBackend,
  IOError,
  LocalStorageBackend,
  MemoryStorage,
  NodeFsBackend,
  NotFoundError,
  OPFSBackend,
  PermissionDeniedError,
  SQLiteBackend,
  ShellFS,
  TfIdfEmbedBackend,
  createAutoBackend,
  createBackend,
  createDefaultBackend,
  shellFsTools
};
//# sourceMappingURL=index.js.map