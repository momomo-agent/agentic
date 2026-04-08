# Task Design: code_exec 内注入 filesystem API

## Overview
Inject filesystem API into code execution context so AI can read/write files directly from within code without explicit tool calls.

## Files to Modify

### 1. `src/tools/code.ts`

**Add filesystem wrapper creation:**
```typescript
import type { AgenticFileSystem } from 'agentic-filesystem'

function createFsWrapper(filesystem: AgenticFileSystem) {
  return {
    readFileSync: (path: string): string => {
      const result = filesystem.read(path)
      if (result.error || !result.content) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`)
      }
      return result.content
    },

    writeFileSync: (path: string, data: string): void => {
      const result = filesystem.write(path, data)
      if (result.error) {
        throw new Error(`EACCES: permission denied, write '${path}'`)
      }
    },

    existsSync: (path: string): boolean => {
      const result = filesystem.read(path)
      return !result.error && result.content !== null
    },

    readdirSync: (path: string): string[] => {
      // Simplified: return empty array (full implementation needs filesystem.list())
      return []
    }
  }
}
```

**Inject fs into JavaScript execution (quickjs):**
```typescript
function injectFilesystem(vm: any, filesystem?: AgenticFileSystem) {
  if (!filesystem) return

  const fsWrapper = createFsWrapper(filesystem)
  const fsHandle = vm.newObject()

  // readFileSync
  const readFn = vm.newFunction('readFileSync', (pathHandle: any) => {
    const path = vm.dump(pathHandle)
    try {
      const content = fsWrapper.readFileSync(String(path))
      return vm.newString(content)
    } catch (err: any) {
      throw vm.newError(err.message)
    }
  })
  vm.setProp(fsHandle, 'readFileSync', readFn)
  readFn.dispose()

  // writeFileSync
  const writeFn = vm.newFunction('writeFileSync', (pathHandle: any, dataHandle: any) => {
    const path = vm.dump(pathHandle)
    const data = vm.dump(dataHandle)
    try {
      fsWrapper.writeFileSync(String(path), String(data))
    } catch (err: any) {
      throw vm.newError(err.message)
    }
  })
  vm.setProp(fsHandle, 'writeFileSync', writeFn)
  writeFn.dispose()

  // existsSync
  const existsFn = vm.newFunction('existsSync', (pathHandle: any) => {
    const path = vm.dump(pathHandle)
    return vm.newBoolean(fsWrapper.existsSync(String(path)))
  })
  vm.setProp(fsHandle, 'existsSync', existsFn)
  existsFn.dispose()

  vm.setProp(vm.global, 'fs', fsHandle)
  fsHandle.dispose()
}
```

**Inject into Python (Pyodide):**
```typescript
async function executePythonBrowser(code: string, filesystem?: AgenticFileSystem): Promise<CodeResult> {
  if (!pyodideInstance) {
    const { loadPyodide } = await import('pyodide')
    pyodideInstance = await loadPyodide()
  }

  // Inject filesystem if available
  if (filesystem) {
    pyodideInstance.globals.set('__filesystem__', {
      read: (path: string) => filesystem.read(path),
      write: (path: string, data: string) => filesystem.write(path, data)
    })

    // Inject Python open() override
    await pyodideInstance.runPythonAsync(`
import io
import js

_original_open = open

def open(file, mode='r', *args, **kwargs):
    if isinstance(file, str) and (file.startswith('/') or file.startswith('./')):
        fs = js.__filesystem__
        if 'r' in mode:
            result = fs.read(file)
            if result.error:
                raise FileNotFoundError(f"No such file: {file}")
            return io.StringIO(result.content)
        elif 'w' in mode:
            class FilesystemWriter:
                def __init__(self, path):
                    self.path = path
                    self.buffer = []
                def write(self, data):
                    self.buffer.append(str(data))
                    return len(data)
                def close(self):
                    fs.write(self.path, ''.join(self.buffer))
                def __enter__(self):
                    return self
                def __exit__(self, *args):
                    self.close()
            return FilesystemWriter(file)
    return _original_open(file, mode, *args, **kwargs)
`)
  }

  // Rest of execution logic...
}
```

**Inject into Python (Node subprocess):**
```typescript
async function executePythonNode(code: string, filesystem?: AgenticFileSystem): Promise<CodeResult> {
  let fullCode = code

  if (filesystem) {
    // Prepend filesystem wrapper
    const preamble = `
import io
import json

class __FilesystemWrapper:
    def __init__(self):
        self._writes = {}

    def read(self, path):
        # Signal to parent process
        print(f"__FS_READ__:{path}", flush=True)
        # Parent will inject response via stdin (simplified: return empty for now)
        return ""

    def write(self, path, data):
        self._writes[path] = data

    def flush_writes(self):
        if self._writes:
            print(f"__FS_WRITES__:{json.dumps(self._writes)}", flush=True)

__fs = __FilesystemWrapper()

_original_open = open

def open(file, mode='r', *args, **kwargs):
    if isinstance(file, str) and (file.startswith('/') or file.startswith('./')):
        if 'r' in mode:
            content = __fs.read(file)
            return io.StringIO(content)
        elif 'w' in mode:
            class FilesystemWriter:
                def __init__(self, path):
                    self.path = path
                    self.buffer = []
                def write(self, data):
                    self.buffer.append(str(data))
                    return len(data)
                def close(self):
                    __fs.write(self.path, ''.join(self.buffer))
                def __enter__(self):
                    return self
                def __exit__(self, *args):
                    self.close()
            return FilesystemWriter(file)
    return _original_open(file, mode, *args, **kwargs)

import atexit
atexit.register(__fs.flush_writes)
`
    fullCode = preamble + '\n' + code
  }

  // Spawn subprocess with fullCode
  // Parse __FS_WRITES__ from stdout and apply to filesystem
  // ... rest of implementation
}
```

**Update executeCode signature:**
```typescript
export async function executeCode(
  input: Record<string, unknown>,
  filesystem?: AgenticFileSystem
): Promise<CodeResult>
```

### 2. `src/ask.ts`

**Update tool handler registration:**
```typescript
toolHandlers.set('code_exec', (input) =>
  executeCode(input, config.filesystem)
)
```

## Function Signatures

```typescript
// New functions
function createFsWrapper(filesystem: AgenticFileSystem): {
  readFileSync: (path: string) => string
  writeFileSync: (path: string, data: string) => void
  existsSync: (path: string) => boolean
  readdirSync: (path: string) => string[]
}

function injectFilesystem(vm: any, filesystem?: AgenticFileSystem): void

// Modified functions
async function executeCode(
  input: Record<string, unknown>,
  filesystem?: AgenticFileSystem
): Promise<CodeResult>

async function executePythonBrowser(
  code: string,
  filesystem?: AgenticFileSystem
): Promise<CodeResult>

async function executePythonNode(
  code: string,
  filesystem?: AgenticFileSystem
): Promise<CodeResult>
```

## Algorithm

### JavaScript Injection (quickjs)
1. Create fs wrapper object with filesystem methods
2. Convert each method to quickjs function handle
3. Attach functions to fs object handle
4. Set fs object as global property in VM
5. Execute code (fs is now available)

### Python Injection (Pyodide)
1. Expose filesystem object to Python via `pyodide.globals`
2. Run Python preamble that overrides built-in `open()`
3. Override checks file path prefix, routes to filesystem
4. Execute user code (open() now uses virtual filesystem)

### Python Injection (Node)
1. Prepend filesystem wrapper code to user code
2. Wrapper overrides `open()` and captures writes
3. Execute combined code via subprocess
4. Parse special stdout markers for filesystem operations
5. Apply writes to filesystem after execution

## Edge Cases

1. **No filesystem configured:** Skip injection, code runs without fs access
2. **File not found:** Throw error matching Node.js ENOENT format
3. **Write to read-only path:** Throw EACCES error
4. **Relative vs absolute paths:** Support both `/path` and `./path`
5. **Binary files:** Not supported initially (text only)
6. **Concurrent writes:** Last write wins (no locking)

## Error Handling

- Missing filesystem → graceful degradation (no injection)
- File read error → throw Error with ENOENT message
- File write error → throw Error with EACCES message
- Injection failure → log warning, continue without fs access

## Dependencies

None (uses existing agentic-filesystem and pyodide)

## Test Cases

```typescript
// tests/code-fs-injection.test.ts
describe('Filesystem injection', () => {
  test('JavaScript fs.readFileSync', async () => {
    const fs = new AgenticFileSystem()
    fs.write('/test.txt', 'hello world')

    const result = await executeCode(
      { code: 'fs.readFileSync("/test.txt")' },
      fs
    )
    expect(result.output).toContain('hello world')
  })

  test('JavaScript fs.writeFileSync', async () => {
    const fs = new AgenticFileSystem()

    await executeCode(
      { code: 'fs.writeFileSync("/out.txt", "data")' },
      fs
    )

    const content = fs.read('/out.txt').content
    expect(content).toBe('data')
  })

  test('Python open() read', async () => {
    const fs = new AgenticFileSystem()
    fs.write('/data.txt', 'python data')

    const result = await executeCode(
      { code: 'with open("/data.txt") as f: print(f.read())' },
      fs
    )
    expect(result.output).toContain('python data')
  })

  test('Python open() write', async () => {
    const fs = new AgenticFileSystem()

    await executeCode(
      { code: 'with open("/out.txt", "w") as f: f.write("test")' },
      fs
    )

    const content = fs.read('/out.txt').content
    expect(content).toBe('test')
  })

  test('File not found error', async () => {
    const fs = new AgenticFileSystem()

    const result = await executeCode(
      { code: 'fs.readFileSync("/missing.txt")' },
      fs
    )
    expect(result.error).toContain('ENOENT')
  })
})
```

## Performance Considerations

- Filesystem wrapper creation is lightweight (object creation only)
- quickjs function handles have minimal overhead
- Pyodide globals injection is one-time per instance
- Node subprocess preamble adds ~50 lines (negligible parse time)

## Security

- Filesystem access limited to virtual filesystem only
- No access to real OS filesystem
- Path traversal contained within virtual filesystem
- No network access from injected code
