# M22 Technical Design — Browser Shell & Pyodide Resilience

## Changes

### 1. shell_exec browser stub (`src/tools/shell.ts`)
The `isNodeEnv()` guard already exists. No code change needed — add test coverage only.

### 2. Pyodide CDN failure (`src/tools/code.ts`)
Wrap the dynamic import in `executePythonBrowser` in try/catch:

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

## Files
- `src/tools/code.ts` — wrap Pyodide import in try/catch
- `src/tools/shell.ts` — no change; test coverage only
