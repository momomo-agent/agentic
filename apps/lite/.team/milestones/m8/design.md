# M8 Technical Design: Code Execution Expansion & Shell Tool

## Architecture Overview

This milestone expands the code execution tool to support multiple languages and filesystem access, plus adds a shell execution tool. All changes maintain browser compatibility.

## Component Design

### 1. Multi-Language Code Execution

**File:** `src/tools/code.ts`

**Language Detection:**
```typescript
function detectLanguage(code: string): 'python' | 'javascript' {
  // Python indicators: import, def, print, if __name__
  const pythonPatterns = /\b(import|from|def|print|if __name__)\b/
  return pythonPatterns.test(code) ? 'python' : 'javascript'
}
```

**Execution Strategy:**
- JavaScript: Continue using `quickjs-emscripten` (existing)
- Python:
  - Browser: `pyodide` package (WASM-based Python)
  - Node: `child_process.spawn('python3', ['-c', code])`

**Environment Detection:**
```typescript
const isBrowser = typeof window !== 'undefined'
```

### 2. Filesystem API Injection

**Approach:** Inject filesystem wrappers into execution context before running code.

**JavaScript Injection:**
```typescript
function createFsWrapper(filesystem: AgenticFileSystem) {
  return {
    readFileSync: (path: string) => {
      const result = filesystem.read(path)
      if (!result.content) throw new Error(`ENOENT: ${path}`)
      return result.content
    },
    writeFileSync: (path: string, data: string) => {
      filesystem.write(path, data)
    },
    existsSync: (path: string) => {
      return filesystem.read(path).content !== null
    }
  }
}
```

Inject into quickjs context via `vm.setProp(vm.global, 'fs', fsHandle)`

**Python Injection:**

For Pyodide:
```python
# Inject before runPython()
import js
def open(path, mode='r'):
    if 'r' in mode:
        content = js.filesystem.read(path).content
        return io.StringIO(content)
    elif 'w' in mode:
        return FilesystemWriter(path, js.filesystem)
```

For Node subprocess:
```typescript
// Prepend to code before spawn
const preamble = `
import io
class FilesystemWriter:
    def __init__(self, path):
        self.path = path
        self.buffer = []
    def write(self, data):
        self.buffer.append(data)
    def close(self):
        # Signal to parent process via special stdout marker
        print(f"__FS_WRITE__:{self.path}:{{''.join(self.buffer)}}")
`
```

### 3. Shell Execution Tool

**File:** `src/tools/shell.ts` (new)

**Tool Definition:**
```typescript
export const shellToolDef: ToolDefinition = {
  name: 'shell_exec',
  description: 'Execute shell commands (ls, cat, grep, find, etc.)',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'Shell command to execute'
      }
    },
    required: ['command']
  }
}
```

**Implementation:**
```typescript
import { AgenticShell } from 'agentic-shell'

export async function executeShell(
  input: Record<string, unknown>,
  filesystem: AgenticFileSystem
): Promise<{ output: string; error?: string }> {
  const command = String(input.command ?? '')
  if (!command) return { output: '', error: 'No command provided' }

  const shell = new AgenticShell(filesystem)
  try {
    const output = await shell.exec(command)
    return { output }
  } catch (err) {
    return { output: '', error: String(err) }
  }
}
```

## Integration Points

### Type Updates

**File:** `src/types.ts`
```typescript
export type ToolName = 'search' | 'code' | 'file' | 'shell'
```

### Tool Registration

**File:** `src/ask.ts`
```typescript
import { shellToolDef, executeShell } from './tools/shell.js'

// In tool registration logic:
if (tools.includes('shell')) {
  toolDefs.push(shellToolDef)
  toolHandlers.set('shell_exec', (input) =>
    executeShell(input, config.filesystem!)
  )
}
```

### Export Updates

**File:** `src/tools/index.ts`
```typescript
export { shellToolDef, executeShell } from './shell.js'
```

## Dependencies

**New packages:**
- `pyodide` (browser Python, ~6MB WASM)
- `agentic-shell` (shell command emulation)

**package.json additions:**
```json
{
  "dependencies": {
    "pyodide": "^0.25.0",
    "agentic-shell": "link:../agentic-shell"
  }
}
```

## Error Handling

1. **Language detection failure:** Default to JavaScript
2. **Python not available (Node):** Return error "Python interpreter not found"
3. **Pyodide load failure (browser):** Return error "Python not supported in this environment"
4. **Filesystem injection failure:** Gracefully degrade (code runs without fs access)
5. **Shell command failure:** Return stderr in error field

## Testing Strategy

**Test files:**
- `tests/code-python.test.ts` - Python execution
- `tests/code-fs-injection.test.ts` - Filesystem API injection
- `tests/shell.test.ts` - Shell tool

**Test cases:**
- Python basic execution
- Python with file operations
- JavaScript with fs.readFileSync
- Language auto-detection
- Shell ls/cat/grep commands
- Error scenarios for all features

## Performance Considerations

- Pyodide loads lazily (first Python execution)
- Cache Pyodide instance across executions
- Shell commands run synchronously (acceptable for simple commands)
- Filesystem operations are in-memory (fast)

## Security

- Code execution remains sandboxed (quickjs for JS, Pyodide for Python)
- Filesystem access limited to virtual filesystem
- Shell commands operate on virtual filesystem only
- No access to real OS filesystem or network
