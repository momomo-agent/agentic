# Technical Design: Fix Python Filesystem Injection Bugs

**Task:** task-1775537901346
**File to modify:** `src/tools/code.ts`

## Bugs to Fix

### Bug #1 (P0): Python reads always return empty string

**Location:** `executePythonNode()` preamble, line ~106

**Root cause:** `def read(self,p): return ""` — the `__FS` class never fetches real content.

**Fix:** Pre-serialize all filesystem reads by scanning the code for `open(...)` calls is fragile. Instead, use a simpler approach: pass file contents via environment variable JSON before execution.

**Approach:** Before spawning python3, read all files that the code might need by injecting a `__FS_DATA__` dict pre-populated from `filesystem`. Since we can't know which files will be read ahead of time, use a stdin-based IPC protocol:

1. Serialize the filesystem snapshot as JSON and pass it via an env var `__FS_JSON`
2. Python preamble reads `os.environ['__FS_JSON']` to populate `__fs._data`

**Updated preamble (read side):**
```python
import io, json as __json, os as __os
__fs_data = __json.loads(__os.environ.get('__FS_JSON', '{}'))
class __FS:
    def __init__(self): self._w={}
    def read(self,p):
        return __fs_data.get(p, None)
    def write(self,p,d): self._w[p]=d
    def flush(self):
        if self._w: print(f"__FS_WRITES__:{__json.dumps(self._w)}",flush=True)
__fs=__FS()
```

**TypeScript side:** Before spawn, call `filesystem.list()` (or use a known set) — but `AgenticFileSystem` may not have a `list()` method. Instead, use a simpler approach: intercept reads lazily via a two-pass protocol is complex.

**Simplest correct fix:** Use a temp-file bridge for the filesystem snapshot:
- Serialize filesystem contents to a JSON env var `__FS_JSON` containing `{ [path]: content }`
- This requires knowing which files exist. Since `AgenticFileSystem` has a `read()` method but no `list()`, we cannot enumerate files.

**Revised approach — stdin IPC:**
Spawn python3 with a wrapper script that reads a JSON blob from stdin (file map), then executes user code:

```typescript
// In executePythonNode():
// 1. Build file map by attempting reads of paths referenced in code
// 2. Pass as JSON via stdin to a wrapper

const wrapperCode = `
import sys, io, json as __json
__fs_data = __json.loads(sys.stdin.readline())
# ... preamble with __fs_data populated
`
proc = spawn('python3', ['-c', wrapperCode])
proc.stdin.write(JSON.stringify(fileMap) + '\n')
```

But we still can't enumerate files. **Final approach:** pass an empty initial map and support lazy reads via a synchronous IPC pipe — too complex.

**Pragmatic fix:** Since `AgenticFileSystem` is virtual/in-memory, expose a `getAll()` or snapshot method. If unavailable, document that Python Node reads require files to be pre-declared.

**Actual minimal fix given current API:** Check if `AgenticFileSystem` has any enumeration method.

---

## Revised Design (after checking AgenticFileSystem API)

Looking at the existing code, `filesystem.read(path)` is async and returns `{ content, error }`. There is no list/enumerate API visible.

**Minimal correct fix for Bug #1:** Use stdin to pass a pre-built file map. The caller (TypeScript) must build this map. Since we can't enumerate, we parse the Python code for string literals used as file paths and pre-fetch those.

**Path extraction regex:**
```typescript
function extractPaths(code: string): string[] {
  const matches = [...code.matchAll(/open\(\s*['"]([^'"]+)['"]/g)]
  return matches.map(m => m[1])
}
```

Then pre-fetch those paths from filesystem and pass as JSON via stdin.

---

## Concrete Implementation Plan

### `executePythonNode()` changes in `src/tools/code.ts`

**Step 1 — Extract referenced paths and pre-fetch:**
```typescript
async function buildFileMap(code: string, filesystem: AgenticFileSystem): Promise<Record<string, string>> {
  const paths = [...code.matchAll(/open\(\s*['"]([^'"]+)['"]/g)].map(m => m[1])
  const map: Record<string, string> = {}
  for (const p of paths) {
    const r = await filesystem.read(p)
    if (r.content) map[p] = r.content
    // normalize relative paths
    if (p.startsWith('./')) {
      const abs = p.slice(1) // './foo' -> '/foo'
      const r2 = await filesystem.read(abs)
      if (r2.content) map[p] = r2.content
    }
  }
  return map
}
```

**Step 2 — Updated preamble using stdin JSON:**
```python
import sys as __sys, io, json as __json
__fs_data = __json.loads(__sys.stdin.readline())
class __FS:
    def __init__(self): self._w={}
    def read(self,p):
        d=__fs_data.get(p) or __fs_data.get('./'+p.lstrip('/'))
        return d
    def write(self,p,d): self._w[p]=d
    def flush(self):
        if self._w: print(f"__FS_WRITES__:{__json.dumps(self._w)}",flush=True)
__fs=__FS()
_open=open
def open(file,mode='r',*a,**k):
    if isinstance(file,str) and (file.startswith('/') or file.startswith('./')):
        if 'r' in mode:
            content=__fs.read(file)
            if content is None: raise FileNotFoundError(f"No such file: {file}")
            return io.StringIO(content)
        if 'w' in mode:
            class W:
                def __init__(self,p): self.p=p;self.b=[]
                def write(self,d): self.b.append(str(d));return len(d)
                def close(self): __fs.write(self.p,''.join(self.b))
                def __enter__(self): return self
                def __exit__(self,*a): self.close()
            return W(file)
    return _open(file,mode,*a,**k)
import atexit; atexit.register(__fs.flush)
```

**Step 3 — Write file map to stdin:**
```typescript
const fileMap = await buildFileMap(code, filesystem)
proc.stdin.write(JSON.stringify(fileMap) + '\n')
proc.stdin.end()
```

### Bug #2 Fix — Parse `__FS_WRITES__` and apply to filesystem

In the `proc.on('close', ...)` handler:
```typescript
proc.on('close', async (exitCode) => {
  const writeMatch = stdout.match(/__FS_WRITES__:(.+)$/m)
  if (writeMatch && filesystem) {
    try {
      const writes = JSON.parse(writeMatch[1]) as Record<string, string>
      for (const [path, data] of Object.entries(writes)) {
        await filesystem.write(path, data)
      }
      stdout = stdout.replace(/__FS_WRITES__:.+$/m, '').trim()
    } catch { /* ignore parse errors */ }
  }
  if (exitCode !== 0) {
    resolve({ code, output: stdout, error: stderr || `Exit code ${exitCode}` })
  } else {
    resolve({ code, output: stdout })
  }
})
```

### Bug #3 Fix — Relative path support

Already handled in the new preamble above (`file.startswith('./')` check added).

Also update `buildFileMap` to normalize `./foo` → try both `./foo` and `/foo`.

## Files to Modify

| File | Change |
|------|--------|
| `src/tools/code.ts` | Fix `executePythonNode()`: add `buildFileMap()`, update preamble, write stdin, parse `__FS_WRITES__` |
| `test/code-python-fs.test.ts` | Remove `.fails()` markers after fix |

## Function Signatures

```typescript
// New helper (internal to code.ts)
async function buildFileMap(
  code: string,
  filesystem: AgenticFileSystem
): Promise<Record<string, string>>

// Modified (same signature, fixed implementation)
async function executePythonNode(
  code: string,
  filesystem?: AgenticFileSystem
): Promise<CodeResult>
```

## Edge Cases

| Case | Handling |
|------|----------|
| File not in pre-fetched map | `FileNotFoundError` raised in Python |
| `open()` path not a string literal (dynamic) | Not pre-fetched; will raise `FileNotFoundError` — acceptable limitation |
| `__FS_WRITES__` JSON parse error | Silently ignored, writes lost |
| Python not installed | Existing error handling unchanged |
| Multiple writes to same path | Last write wins (dict overwrite) |
| Relative path `./foo` vs `/foo` | `buildFileMap` tries both; preamble checks both |

## Test Cases to Verify

From `test/code-python-fs.test.ts` (remove `.fails()` after fix):

1. `open('/file.txt', 'r')` returns content from filesystem
2. `open('/out.txt', 'w')` + `write()` persists to filesystem
3. `open('/missing.txt', 'r')` raises `FileNotFoundError`
4. `open('./file.txt', 'r')` works with relative path
5. Multi-line write via `open('/out.txt', 'w')` writes all lines

## Dependencies

- No new packages required
- `AgenticFileSystem` from `agentic-filesystem` (already imported)
- `child_process.spawn` (already used)
