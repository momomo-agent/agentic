# Task Design: brain.js 切到 Engine Registry

**Task ID:** task-1775887196225
**Module:** Server（HTTP/WebSocket） — ARCHITECTURE.md §3
**Module Design:** `.team/designs/server.design.md`

## Current State (verified from source)

`src/server/brain.js` (300 lines) has its own internal `resolveModel(slot)` function (line 57) that:
1. Reads `config.assignments[slot]` to get a modelId
2. Looks up modelId in `config.modelPool` via `getModelPool()`
3. Falls back to legacy `config.llm` format
4. Returns `{ provider, model, apiKey, baseUrl, ollamaHost }`

brain.js then uses the resolved provider to decide how to call LLM:
- `provider === 'ollama'` → direct `fetch()` to Ollama HTTP API (lines 99-171)
- Other providers → `callCloudProvider()` (lines 173-261)

### Current imports from config.js (line 1):
```javascript
import { getConfig, getModelPool, getAssignments, onConfigChange } from '../config.js';
```

### Engine Registry API (verified from src/engine/registry.js):
```javascript
export async function resolveModel(modelId) → { engineId, engine, model, provider, modelName } | null
```

### Engine run() methods — ⚠️ DO NOT EXIST YET
None of the engines (ollama.js, cloud.js) currently have a `run()` method. They only have `status()`, `models()`, `pull()`, `delete()`, `recommended()`.

## Design

### Step 1: Add `run()` to Ollama engine

**File:** `src/engine/ollama.js`
**Add after line 95 (before closing `};`):**

```javascript
/**
 * Run chat/embedding inference via Ollama HTTP API
 * @param {string} modelName - e.g. "gemma4:e4b"
 * @param {object} input - { messages, stream?, tools? } for chat; { text } for embedding
 * @returns {AsyncGenerator|object} - streaming chunks for chat, vector for embedding
 */
async *run(modelName, input) {
  const config = await getConfig();
  const host = getHost(config);

  if (input.text !== undefined) {
    // Embedding mode
    const res = await fetch(`${host}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelName, input: input.text }),
    });
    if (!res.ok) throw new Error(`Ollama embed error: ${res.status}`);
    const data = await res.json();
    yield { type: 'embedding', data: data.embeddings?.[0] };
    return;
  }

  // Chat mode (streaming)
  const body = {
    model: modelName,
    messages: input.messages,
    stream: true,
  };
  if (input.tools?.length) {
    body.tools = input.tools.map(t => ({
      type: 'function',
      function: { name: t.name, description: t.description || '', parameters: t.parameters || {} },
    }));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // FIRST_TOKEN_TIMEOUT_MS

  const res = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let firstToken = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      const json = JSON.parse(line);
      if (!firstToken) { clearTimeout(timeout); firstToken = true; }
      // Yield in brain.js-compatible format
      if (json.message?.tool_calls) {
        yield { type: 'tool_use', tool_calls: json.message.tool_calls };
      } else if (json.message?.content) {
        yield { type: 'content', text: json.message.content };
      }
      if (json.done) return;
    }
  }
}
```

### Step 2: Add `run()` to Cloud engine

**File:** `src/engine/cloud.js`
**Add to the returned object (after `recommended()`):**

```javascript
async *run(modelName, input) {
  // Delegate to provider-specific API
  // input: { messages, stream?, tools?, apiKey?, baseUrl? }
  const key = input.apiKey || apiKey;
  const url = input.baseUrl || baseUrl;

  if (provider === 'openai' || provider === 'google') {
    // OpenAI-compatible streaming
    const endpoint = url || (provider === 'openai'
      ? 'https://api.openai.com/v1'
      : 'https://generativelanguage.googleapis.com/v1beta/openai');
    const body = { model: modelName, messages: input.messages, stream: true };
    if (input.tools?.length) body.tools = input.tools;

    const res = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${provider} HTTP ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
        const json = JSON.parse(line.slice(6));
        const delta = json.choices?.[0]?.delta;
        if (delta?.tool_calls) yield { type: 'tool_use', tool_calls: delta.tool_calls };
        else if (delta?.content) yield { type: 'content', text: delta.content };
      }
    }
  } else if (provider === 'anthropic') {
    const endpoint = url || 'https://api.anthropic.com/v1';
    const body = {
      model: modelName,
      messages: input.messages.filter(m => m.role !== 'system'),
      max_tokens: 4096,
      stream: true,
    };
    const sys = input.messages.find(m => m.role === 'system');
    if (sys) body.system = sys.content;
    if (input.tools?.length) body.tools = input.tools;

    const res = await fetch(`${endpoint}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`anthropic HTTP ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const json = JSON.parse(line.slice(6));
        if (json.type === 'content_block_delta' && json.delta?.text) {
          yield { type: 'content', text: json.delta.text };
        }
      }
    }
  }
}
```

### Step 3: Rewrite brain.js resolveModel to use registry

**File:** `src/server/brain.js`

**Change imports (line 1):**
```javascript
// BEFORE:
import { getConfig, getModelPool, getAssignments, onConfigChange } from '../config.js';

// AFTER:
import { getConfig, getAssignments, onConfigChange } from '../config.js';
import { resolveModel as registryResolve } from '../engine/registry.js';
```

**Replace internal `resolveModel()` function (lines 57-89):**
```javascript
async function resolveModel(slot = 'chat') {
  const config = await ensureConfig();
  const assignments = config.assignments || {};
  const modelId = assignments[slot];

  if (modelId) {
    const resolved = await registryResolve(modelId);
    if (resolved) {
      return {
        ...resolved,
        apiKey: resolved.engine.apiKey,
        baseUrl: resolved.engine.baseUrl,
        ollamaHost: config.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434',
      };
    }
  }

  // Fallback to old config.llm format for backward compat
  if (config.llm?.model) {
    return {
      provider: config.llm.provider || 'ollama',
      model: config.llm.model,
      ollamaHost: config.ollamaHost || config.llm?.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434',
    };
  }

  return null;
}
```

**Replace `callOllama()` (lines 99-171) to use engine.run():**
```javascript
async function* callOllama(resolved, messages, toolDefs) {
  // If resolved has engine with run(), use it
  if (resolved.engine?.run) {
    yield* resolved.engine.run(resolved.modelName || resolved.model, {
      messages,
      tools: toolDefs,
    });
    return;
  }
  // Legacy direct Ollama call (kept for backward compat with old config.llm)
  // ... existing fetch logic stays as fallback ...
}
```

**Replace `callCloudProvider()` (lines 173-261) similarly:**
```javascript
async function* callCloudProvider(resolved, messages, toolDefs) {
  if (resolved.engine?.run) {
    yield* resolved.engine.run(resolved.modelName || resolved.model, {
      messages,
      tools: toolDefs,
      apiKey: resolved.apiKey,
      baseUrl: resolved.baseUrl,
    });
    return;
  }
  // Legacy direct cloud call (kept for backward compat)
  // ... existing fetch logic stays as fallback ...
}
```

### Step 4: Remove `getModelPool` import

After step 3, `getModelPool` is no longer used in brain.js. Remove it from the import.

## Files to Modify

| File | Action | Lines |
|------|--------|-------|
| `src/engine/ollama.js` | Add `async *run()` method | After line 95 |
| `src/engine/cloud.js` | Add `async *run()` method to returned object | After line 57 |
| `src/server/brain.js` | Replace `resolveModel()`, update imports, delegate to `engine.run()` | Lines 1, 57-89, 99-171, 173-261 |

## Cloud Fallback Logic — PRESERVED

The existing cloud fallback state machine (`_cloudMode`, `_errorCount`, `FIRST_TOKEN_TIMEOUT_MS`, `MAX_ERRORS`, probing) stays in brain.js. It wraps the engine calls:
- On Ollama timeout/error → increment `_errorCount` → switch to `_cloudMode`
- In `_cloudMode` → resolve `chatFallback` slot → call cloud engine
- Probing timer → test Ollama → restore local

This logic is brain.js's responsibility (orchestration), not the engine's.

## Test Cases

1. **brain.js resolveModel uses registry** — mock `registryResolve` to return `{ engine, engineId, modelName }`, verify brain.js calls `engine.run()`
2. **Ollama engine run() streams content** — mock `fetch` to return NDJSON stream, verify `{ type: 'content', text }` chunks
3. **Ollama engine run() handles tool_use** — mock response with `tool_calls`, verify `{ type: 'tool_use' }` chunk
4. **Cloud engine run() streams OpenAI SSE** — mock SSE response, verify content chunks
5. **Fallback to legacy config.llm** — no assignments set, verify brain.js falls back to `config.llm.model`
6. **brain.js no longer imports getModelPool** — static import check
7. **Existing tests pass** — `test/server/brain*.test.js`, `test/m98-cloud-fallback.test.js`, `test/runtime/llm*.test.js`

## ⚠️ Unverified Assumptions

- Ollama `run()` timeout of 5000ms matches brain.js's `FIRST_TOKEN_TIMEOUT_MS` — this is intentional duplication; brain.js wraps with its own AbortController for the fallback state machine
- Cloud engine `run()` assumes OpenAI-compatible SSE format for Google provider — verified from existing `callCloudProvider()` logic in brain.js
