# Task Design: Ollama自动安装 — setup.js执行安装命令

## File to Modify
`src/detector/optimizer.js`

## Current State
`promptInstallation(platform)` only prints install instructions. `setupOllama()` calls it and returns `{ installed: false }` without executing anything.

## Change: Replace `promptInstallation` with `executeInstall`

### New function signature
```js
async function executeInstall(platform): Promise<void>
```

### Logic
1. Print the install command to the user (same as current `promptInstallation`)
2. Prompt: `"Install Ollama now? [y/N] "` via `readline` on `process.stdin`/`process.stdout`
3. If user answers `y`/`Y`:
   - `darwin`: `spawn('brew', ['install', 'ollama'])` — stream stdout/stderr to console
   - `linux`: `spawn('sh', ['-c', 'curl -fsSL https://ollama.ai/install.sh | sh'])` — stream output
   - `win32`: print download URL, exit (cannot auto-install)
   - Wait for process close; if exit code ≠ 0, throw `Error('Install failed')`
4. If user declines or platform is `win32`: print message and `process.exit(1)`

### Updated `setupOllama` call site
```js
if (!installed) {
  spinner.fail('Ollama not installed');
  await executeInstall(process.platform);  // was: promptInstallation(...)
  // re-detect after install
  const result2 = await detectOllama();
  if (!result2.installed) return { installed: false, version: null, modelReady: false, modelName: profile.llm.model };
  spinner.succeed(`Ollama ${result2.version} installed`);
  // continue with model pull using result2.version
}
```

### readline helper (inline, no extra import needed beyond `node:readline`)
```js
import { createInterface } from 'node:readline';

function askConfirm(question) {
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, ans => { rl.close(); resolve(ans.trim().toLowerCase()); });
  });
}
```

## Edge Cases
- `win32`: skip spawn, print URL, exit 1
- Install process exits non-zero: throw, caught by outer try/catch → falls back to cloud
- User sends EOF (Ctrl+D): treat as decline

## Dependencies
- `node:readline` (built-in, already available)
- `node:child_process` `spawn` (already imported)

## Test Cases
- Ollama not installed, user confirms → install runs, re-detect succeeds → service starts
- Ollama not installed, user declines → process exits with code 1
- Ollama already installed → `executeInstall` never called (no regression)
