# Task Design: code_exec 加 Python 支持

## Overview
Extend `code_exec` tool to support Python execution alongside JavaScript. Auto-detect language and route to appropriate execution engine.

## Files to Modify

### 1. `src/tools/code.ts`

**Add language detection function:**
```typescript
function detectLanguage(code: string): 'python' | 'javascript' {
  const pythonPatterns = /\b(import|from|def|print|if __name__|class\s+\w+:)\b/
  return pythonPatterns.test(code) ? 'python' : 'javascript'
}
```

**Add Python execution functions:**
```typescript
// Browser environment detection
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'

// Pyodide instance cache (browser)
let pyodideInstance: any = null

async function executePythonBrowser(code: string): Promise<CodeResult> {
  if (!pyodideInstance) {
    const { loadPyodide } = await import('pyodide')
    pyodideInstance = await loadPyodide()
  }

  try {
    // Capture stdout
    const output: string[] = []
    pyodideInstance.setStdout({
      batched: (text: string) => output.push(text)
    })

    const result = await pyodideInstance.runPythonAsync(code)
    const resultStr = result !== undefined && result !== null ? String(result) : ''

    return {
      code,
      output: [...output, ...(resultStr ? [`→ ${resultStr}`] : [])].join('\n')
    }
  } catch (err: any) {
    return {
      code,
      output: '',
      error: err.message || String(err)
    }
  }
}

async function executePythonNode(code: string): Promise<CodeResult> {
  const { spawn } = await import('child_process')

  return new Promise((resolve) => {
    const proc = spawn('python3', ['-c', code])
    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => { stdout += data.toString() })
    proc.stderr.on('data', (data) => { stderr += data.toString() })

    proc.on('close', (exitCode) => {
      if (exitCode !== 0) {
        resolve({ code, output: stdout, error: stderr || `Exit code ${exitCode}` })
      } else {
        resolve({ code, output: stdout })
      }
    })

    proc.on('error', (err) => {
      resolve({ code, output: '', error: `Python not found: ${err.message}` })
    })
  })
}
```

**Modify `executeCode` function:**
```typescript
export async function executeCode(
  input: Record<string, unknown>,
): Promise<CodeResult> {
  const code = String(input.code ?? '')
  if (!code) return { code: '', output: '', error: 'No code provided' }

  const language = detectLanguage(code)

  // Route to Python execution
  if (language === 'python') {
    if (isBrowser) {
      return executePythonBrowser(code)
    } else {
      return executePythonNode(code)
    }
  }

  // Existing JavaScript execution logic (unchanged)
  const hasAwait = /\bawait\b/.test(code)
  // ... rest of existing JS execution code
}
```

### 2. `package.json`

**Add dependencies:**
```json
{
  "dependencies": {
    "pyodide": "^0.25.0"
  }
}
```

## Function Signatures

```typescript
// New functions
function detectLanguage(code: string): 'python' | 'javascript'
async function executePythonBrowser(code: string): Promise<CodeResult>
async function executePythonNode(code: string): Promise<CodeResult>

// Modified function
async function executeCode(input: Record<string, unknown>): Promise<CodeResult>
```

## Algorithm

1. Receive code string from tool input
2. Run `detectLanguage()` to check for Python keywords
3. If Python:
   - Check environment (browser vs Node)
   - Browser: Load Pyodide (cached), run via `runPythonAsync()`
   - Node: Spawn `python3 -c` subprocess, capture stdout/stderr
4. If JavaScript: Use existing quickjs-emscripten logic
5. Return `CodeResult` with output or error

## Edge Cases

1. **Python not installed (Node):** Catch spawn error, return "Python not found" error
2. **Pyodide load failure (browser):** Catch import error, return "Python not supported" error
3. **Ambiguous code (no clear language markers):** Default to JavaScript
4. **Mixed JS/Python syntax:** Detection runs first, may misclassify - acceptable tradeoff
5. **Long-running Python code:** No timeout implemented initially (future enhancement)

## Error Handling

- Pyodide import failure → return CodeResult with error field
- Python spawn failure → return CodeResult with error field
- Python runtime errors → captured in stderr, returned in error field
- Syntax errors → captured by Python interpreter, returned in error field

## Dependencies

- `pyodide` package (browser Python WASM runtime)
- `child_process` (Node.js built-in, for subprocess)

## Test Cases

```typescript
// tests/code-python.test.ts
describe('Python execution', () => {
  test('basic Python print', async () => {
    const result = await executeCode({ code: 'print("hello")' })
    expect(result.output).toContain('hello')
    expect(result.error).toBeUndefined()
  })

  test('Python with return value', async () => {
    const result = await executeCode({ code: '2 + 2' })
    expect(result.output).toContain('4')
  })

  test('Python syntax error', async () => {
    const result = await executeCode({ code: 'print(' })
    expect(result.error).toBeDefined()
  })

  test('language detection - Python', () => {
    expect(detectLanguage('import os')).toBe('python')
    expect(detectLanguage('def foo():')).toBe('python')
    expect(detectLanguage('print("hi")')).toBe('python')
  })

  test('language detection - JavaScript', () => {
    expect(detectLanguage('console.log("hi")')).toBe('javascript')
    expect(detectLanguage('const x = 5')).toBe('javascript')
  })
})
```

## Performance Considerations

- Pyodide loads lazily on first Python execution (~6MB WASM, 1-2s initial load)
- Subsequent Python executions reuse cached instance (fast)
- Node subprocess has ~50-100ms overhead per execution
- Language detection is regex-based (negligible overhead)

## Security

- Browser: Pyodide runs in WASM sandbox (no OS access)
- Node: Python subprocess inherits limited environment (no network by default)
- No filesystem access yet (handled in separate task)
