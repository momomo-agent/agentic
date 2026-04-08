# Design: Pyodide CDN load failure graceful handling

## File
`src/tools/code.ts` — `executePythonBrowser()`

## Change
Wrap the Pyodide dynamic import in try/catch:

```ts
if (!pyodideInstance) {
  try {
    const { loadPyodide } = await import('pyodide')
    pyodideInstance = await loadPyodide()
  } catch (err: any) {
    return { code, output: '', error: `Pyodide unavailable: ${err.message || String(err)}` }
  }
}
```

## Function signature (unchanged)
`async function executePythonBrowser(code: string, filesystem?: AgenticFileSystem): Promise<CodeResult>`

## Edge cases
- CDN blocked (network error): caught, returns `error` field
- CSP violation: caught, returns `error` field
- Subsequent calls after failure: `pyodideInstance` remains `null`, each call retries load (allows recovery if network comes back)

## Test cases
- Mock `import('pyodide')` to reject → result resolves with `error` containing "Pyodide unavailable"
- Mock `import('pyodide')` to succeed → normal execution path unaffected
