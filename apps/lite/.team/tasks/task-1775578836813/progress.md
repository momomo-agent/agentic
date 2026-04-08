# Pyodide CDN load failure graceful handling

## Progress

- Wrapped pyodide import in try/catch in executePythonBrowser() (src/tools/code.ts)
- Returns error "Pyodide unavailable: ..." on CDN/load failure; pyodideInstance stays null for retry
- Added test/m22-pyodide-cdn-failure.test.ts — passes ✓
