# Task Design: Ollama自动安装 + 模型拉取

## Files
- `src/detector/ollama.js` — new file

## Interface

```js
// src/detector/ollama.js
export async function ensureOllama(model, onProgress) → Promise<void>
// model: string (e.g. 'gemma4:26b')
// onProgress: (msg: string) => void
```

## Logic

```
1. which('ollama') → if found, skip install
2. if not found:
   - darwin/linux: exec `curl -fsSL https://ollama.ai/install.sh | sh`
   - win32: exec `winget install Ollama.Ollama`
   - on error: throw Error('Ollama install failed: ' + stderr)
3. exec `ollama pull <model>` with stdio piped
   - pipe stdout lines to onProgress()
   - on non-zero exit: throw Error('Model pull failed')
```

## Error Handling
- Install failure: throw with stderr message
- Pull failure: throw with exit code
- Caller (bin/agentic-service.js) catches and logs, continues with cloud fallback

## Test Cases
- already installed → skip install, only pull
- not installed → install called, then pull
- pull fails → throws error
