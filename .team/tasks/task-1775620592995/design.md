# Task Design: Enforce toolConfig.code.timeout in executeCode

## Files to Modify

1. `src/tools/code.ts` — add timeout enforcement
2. `src/ask.ts` — thread timeout to executeCode in handleToolCall

## Depends On

- None (independent of streaming tasks)

## executeCode signature change — `src/tools/code.ts`

Change from:
```typescript
export async function executeCode(
  input: Record<string, unknown>,
  filesystem?: AgenticFileSystem,
): Promise<CodeResult>
```

To:
```typescript
export async function executeCode(
  input: Record<string, unknown>,
  filesystem?: AgenticFileSystem,
  timeout?: number,
): Promise<CodeResult>
```

## Timeout enforcement — `src/tools/code.ts`

Add a helper function at the top of the file:

```typescript
function withTimeout<T>(promise: Promise<T>, timeoutMs?: number, code?: string): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) return promise

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Code execution timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    promise.then(
      (result) => { clearTimeout(timer); resolve(result) },
      (err) => { clearTimeout(timer); reject(err) },
    )
  })
}
```

### Apply to each execution path:

**executeJavaScript path (QuickJS)**:
```typescript
// Current: const result = vm.evalCode(code)
// New:
const result = await withTimeout(
  new Promise<CodeResult>((resolve, reject) => {
    try {
      const r = vm.evalCode(code)
      resolve(handleResult(r, vm))
    } catch (e) { reject(e) }
  }),
  timeout,
  code,
)
```

For async QuickJS (when code has `await`):
```typescript
const result = await withTimeout(
  new Promise<CodeResult>((resolve, reject) => {
    try {
      const r = vm.evalCode(`(async()=>{${code}})()`)
      // For async, need to handle promise result
      if (r && typeof r === 'object' && 'value' in r) {
        const val = vm.dump(r.value)
        if (val && typeof val.then === 'function') {
          val.then((v: unknown) => resolve({ code, output: JSON.stringify(v) }), reject)
        } else {
          resolve(handleResult(r, vm))
        }
      } else {
        resolve(handleResult(r, vm))
      }
    } catch (e) { reject(e) }
  }),
  timeout,
  code,
)
```

**executePythonBrowser path (Pyodide)**:
```typescript
// Current: const result = await pyodide.runPythonAsync(code)
// New:
const result = await withTimeout(
  pyodide.runPythonAsync(code).then((r: unknown) => ({
    code, output: String(r ?? logs.join('\n')), error: undefined
  })),
  timeout,
  code,
)
```

**executePythonNode path (python3 subprocess)**:
```typescript
// Current: execFile('python3', ['-c', fullCode], ...)
// New: Use the timeout option built into execFile
const result = await new Promise<CodeResult>((resolve, reject) => {
  const child = execFile(
    'python3', ['-c', fullCode],
    { timeout: timeout ?? 0, maxBuffer: 1024 * 1024 },
    (err, stdout, stderr) => {
      if (err && err.killed && err.signal === 'SIGTERM') {
        // This is a timeout
        reject(new Error(`Code execution timed out after ${timeout}ms`))
        return
      }
      // ... existing parsing logic for __FS_WRITES__, output, error
    }
  )
})
```

### Timeout error format:
All paths must throw: `Error('Code execution timed out after ${timeout}ms')`

## ask.ts threading — `src/ask.ts`

In the `handleToolCall` callback, change the `code_exec` case from:
```typescript
case 'code_exec': {
  const result = await executeCode(tc.input, filesystem)
  // ...
}
```

To:
```typescript
case 'code_exec': {
  const timeout = config.toolConfig?.code?.timeout
  const result = await executeCode(tc.input, filesystem, timeout)
  // ...
}
```

## Edge Cases

- **timeout = undefined**: No enforcement — backward compatible
- **timeout = 0**: Treat as no timeout (same as undefined)
- **timeout < 0**: Treat as no timeout
- **Timeout fires during filesystem writes**: Partial writes may occur; this is acceptable (file state is undefined on timeout)
- **python3 subprocess**: `execFile` timeout sends SIGTERM; child may not clean up temp files

## Test Cases

- `executeCode({code: 'while(true){}'}, undefined, 500)` → rejects with timeout error, completes < 2000ms
- `executeCode({code: 'while True: pass'}, undefined, 500)` (Python browser) → rejects with timeout error
- `executeCode({code: 'while True: pass'}, undefined, 500)` (Python Node) → rejects with timeout error
- `executeCode({code: '1+1'}, undefined, undefined)` → returns normally (no timeout)
- `executeCode({code: '1+1'}, undefined, 0)` → returns normally (no timeout)
- `executeCode({code: '1+1'}, undefined, 10000)` → returns normally (timeout long enough)

## Dependencies

- None
