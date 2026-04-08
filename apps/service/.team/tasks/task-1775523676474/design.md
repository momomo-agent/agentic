# Ollama Auto-Install + Model Pull — Technical Design

## Files to Modify
- `src/detector/ollama.js` — already has `ensureOllama(model, onProgress)`, verify completeness

## Current State
`ensureOllama(model, onProgress)` exists with:
- `isOllamaInstalled()` via `which ollama`
- `installOllama()` via curl/winget
- `pullModel(model, onProgress)` via `ollama pull`

## Gaps to Fix
1. After install, Ollama service may not be running — add `startOllamaService()` step
2. Progress output from `ollama pull` is JSON lines — parse and forward meaningful progress %
3. macOS: `brew install ollama` is more reliable than curl script — detect brew availability

## Function Signatures
```js
// src/detector/ollama.js
export async function ensureOllama(model: string, onProgress?: (msg: string) => void): Promise<void>
// Throws if install fails after retry
```

## Algorithm
1. `isOllamaInstalled()` → if false, `installOllama()`
2. `isOllamaRunning()` → `curl -s http://localhost:11434/api/tags` → if fails, spawn `ollama serve` detached
3. `pullModel(model, onProgress)` → parse stdout JSON `{ status, completed, total }` → call `onProgress(\`${status} ${pct}%\`)`

## Edge Cases
- Windows: `winget` may not be available → fallback to direct installer download URL
- Model already pulled → `ollama pull` is a no-op, handle gracefully
- Timeout: `ollama serve` startup → poll up to 10s with 500ms intervals

## Test Cases
- Ollama already installed + running → skips install, pulls model
- `onProgress` receives non-empty strings during pull
