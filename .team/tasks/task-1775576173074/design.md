# Design: Gate shell_exec behind environment detection

## Files to Modify
- `src/tools/shell.ts`
- `src/ask.ts`

## Approach

`shell_exec` already uses a dynamic `import('agentic-shell')` inside `executeShell`, so the runtime import is safe. The problem is `shellToolDef` is always registered when `'shell'` is in `config.tools`, and `agentic-shell` may transitively pull in `child_process` at bundle time.

The fix: gate shell tool registration in `buildToolDefs` behind an environment check, and ensure `executeShell` never attempts the dynamic import in browser contexts.

## Changes

### `src/tools/shell.ts`

Add and export an environment detection helper:

```ts
export function isNodeEnv(): boolean {
  return typeof process !== 'undefined' && process.versions?.node != null
}
```

Guard the dynamic import inside `executeShell`:

```ts
export async function executeShell(
  input: Record<string, unknown>,
  filesystem?: AgenticFileSystem,
): Promise<ShellResult> {
  const command = String(input.command ?? '')
  if (!command) return { command: '', output: '', error: 'No command provided', exitCode: 1 }
  if (!isNodeEnv()) return { command, output: '', error: 'shell_exec not available in browser', exitCode: 1 }
  if (!filesystem) return { command, output: '', error: 'No filesystem configured', exitCode: 1 }
  try {
    const { AgenticShell } = await import('agentic-shell')
    const shell = new AgenticShell(filesystem)
    const output = await shell.exec(command)
    return { command, output, exitCode: 0 }
  } catch (err: any) {
    return { command, output: '', error: err.message || String(err), exitCode: 1 }
  }
}
```

### `src/ask.ts`

In `buildToolDefs`, gate shell registration:

```ts
import { shellToolDef, executeShell, isNodeEnv } from './tools/shell.js'
// ...
if (tools.includes('shell') && isNodeEnv()) defs.push(shellToolDef)
```

## Edge Cases
- Browser bundlers (Vite/webpack) will tree-shake the `agentic-shell` dynamic import path since `isNodeEnv()` returns false at runtime; no `child_process` reference survives.
- In Node.js, behavior is unchanged.
- If user passes `'shell'` in tools in a browser, the tool is silently omitted from the tool list (not an error).

## Test Cases
1. In Node.js: `buildToolDefs(['shell'])` returns array containing `shellToolDef`.
2. In browser (mock `process` undefined): `buildToolDefs(['shell'])` returns empty array.
3. `executeShell({command:'echo hi'}, fs)` in browser returns `{exitCode:1, error:'shell_exec not available in browser'}`.
4. `executeShell({command:'echo hi'}, fs)` in Node.js returns `{exitCode:0, output:'hi\n'}`.
