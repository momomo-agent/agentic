// src/filesystem.ts
var AgenticFileSystem = class {
  storage;
  embed;
  readOnly;
  constructor(config) {
    this.storage = config.storage;
    this.embed = config.embed;
    this.readOnly = config.readOnly ?? false;
  }
  // ── Core file operations ──
  async read(path) {
    try {
      const content = await this.storage.get(path);
      if (content === null) {
        return { path, error: "File not found" };
      }
      return { path, content };
    } catch (err) {
      return { path, error: String(err) };
    }
  }
  async write(path, content) {
    if (this.readOnly) {
      return { path, error: "Read-only file system" };
    }
    try {
      await this.storage.set(path, content);
      return { path };
    } catch (err) {
      return { path, error: String(err) };
    }
  }
  async delete(path) {
    if (this.readOnly) {
      return { path, error: "Read-only file system" };
    }
    try {
      await this.storage.delete(path);
      return { path };
    } catch (err) {
      return { path, error: String(err) };
    }
  }
  async ls(prefix) {
    try {
      const paths = await this.storage.list(prefix);
      return paths.map((name) => ({ name, type: "file" }));
    } catch (err) {
      return [];
    }
  }
  // ── Smart grep with multiple strategies ──
  async grep(pattern, options) {
    if (options?.semantic && this.embed) {
      return await this.semanticGrep(pattern);
    }
    return await this.literalGrep(pattern);
  }
  async literalGrep(pattern) {
    try {
      const results = await this.storage.scan(pattern);
      const matches = [];
      for (const { path, content } of results) {
        const lines = content.split("\n");
        lines.forEach((line, idx) => {
          if (line.includes(pattern)) {
            matches.push({
              path,
              line: idx + 1,
              content: line,
              match: pattern
            });
          }
        });
      }
      return matches;
    } catch (err) {
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
      return [];
    }
  }
  // ── Tool definitions for AI agents ──
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
      }
    ];
  }
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
      default:
        return { error: "Unknown tool" };
    }
  }
};

// src/backends/agentic-store.ts
var AgenticStoreBackend = class {
  constructor(store) {
    this.store = store;
  }
  store;
  async get(path) {
    const value = await this.store.get(path);
    return value ?? null;
  }
  async set(path, content) {
    await this.store.set(path, content);
  }
  async delete(path) {
    await this.store.delete(path);
  }
  async list(prefix) {
    const keys = await this.store.keys();
    if (!prefix) return keys;
    return keys.filter((k) => k.startsWith(prefix));
  }
  async scan(pattern) {
    const keys = await this.store.keys();
    const results = [];
    for (const key of keys) {
      const value = await this.store.get(key);
      if (typeof value === "string" && value.includes(pattern)) {
        results.push({ path: key, content: value });
      }
    }
    return results;
  }
};
export {
  AgenticFileSystem,
  AgenticStoreBackend
};
//# sourceMappingURL=index.js.map