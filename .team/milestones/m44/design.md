# M44 Technical Design: Ollama Auto-Install + npx Entrypoint + Multi-Device Brain State

## Task 1: Ollama auto-install (task-1775523676474)

**File:** `src/cli/setup.js`

```js
async function ensureOllama(profile) // detects binary, installs if missing, pulls model
async function installOllama()        // platform-specific download (darwin/linux/win32)
async function pullModel(model)       // streams pull progress to stdout
```

- Use `which ollama` / `where ollama` to detect binary
- Download URL: `https://ollama.com/install.sh` (linux/mac), MSI for win32
- Pull via `ollama pull <model>` child_process with stdout piped for progress
- Edge case: partial install — check binary is executable after install

## Task 2: npx entrypoint (task-1775523681453)

**File:** `bin/agentic-service.js`

- Verify `package.json` has `"bin": { "agentic-service": "bin/agentic-service.js" }`
- File must have `#!/usr/bin/env node` shebang and be chmod +x
- Entry calls `src/cli/index.js` start flow
- Edge case: missing node_modules — print clear error and exit 1

## Task 3: Multi-device brain state sharing (task-1775523681486)

**File:** `src/server/hub.js`

```js
broadcastSession(sessionData)  // emit 'session' event to all connected WS clients
```

**File:** `src/server/brain.js`

- After each LLM response, call `hub.broadcastSession({ history, profile })`
- Session payload: `{ history: Message[], profile: string, updatedAt: number }`
- Edge case: no connected devices — broadcastSession is a no-op
