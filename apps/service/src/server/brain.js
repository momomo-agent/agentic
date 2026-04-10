import { getConfig, getModelPool, getAssignments, onConfigChange } from '../config.js';
import { getSession, broadcastSession } from './hub.js';
import { startMark, endMark } from '../runtime/profiler.js';

const tools = new Map();
let _config = null;

// Cloud fallback state
let _cloudMode = false;
let _errorCount = 0;
let _probeTimer = null;
const FIRST_TOKEN_TIMEOUT_MS = 5000;
const MAX_ERRORS = 3;
const PROBE_INTERVAL_MS = 60000;

async function ensureConfig() {
  if (!_config) _config = await getConfig();
  return _config;
}
onConfigChange(c => {
  _config = c;
  _cloudMode = false;
  _errorCount = 0;
  stopProbing();
  console.log('[brain] config reloaded');
});

function startProbing() {
  if (_probeTimer) return;
  _probeTimer = setInterval(async () => {
    try {
      const config = await ensureConfig();
      const ollamaHost = config.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434';
      const res = await fetch(`${ollamaHost}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        console.log('[brain] Ollama probe succeeded, restoring local');
        _cloudMode = false;
        _errorCount = 0;
        stopProbing();
      }
    } catch { /* probe failed, stay in cloud mode */ }
  }, PROBE_INTERVAL_MS);
}

function stopProbing() {
  if (_probeTimer) { clearInterval(_probeTimer); _probeTimer = null; }
}

export function registerTool(name, fn) {
  tools.set(name, fn);
}

/**
 * Resolve a model from the pool by assignment slot.
 * Returns { provider, model, apiKey, baseUrl, ollamaHost } or null.
 */
async function resolveModel(slot = 'chat') {
  const config = await ensureConfig();
  const assignments = config.assignments || {};
  const modelId = assignments[slot];

  if (modelId) {
    const pool = await getModelPool();
    const entry = pool.find(m => m.id === modelId);
    if (entry) {
      return {
        provider: entry.provider,
        model: entry.name,
        apiKey: entry.apiKey,
        baseUrl: entry.baseUrl,
        ollamaHost: config.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434',
      };
    }
  }

  // Fallback to old config.llm format for backward compat
  if (config.llm?.model) {
    return {
      provider: config.llm.provider || 'ollama',
      model: config.llm.model,
      apiKey: config.llm.apiKey,
      baseUrl: config.llm.baseUrl,
      ollamaHost: config.llm.ollamaHost || config.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434',
    };
  }

  return null;
}

function normalizeMessages(messages) {
  return messages.map(msg => {
    if (msg.role === 'tool' && msg.tool_use_id) {
      return { role: 'user', content: [{ type: 'tool_result', tool_use_id: msg.tool_use_id, content: String(msg.content) }] };
    }
    return msg;
  });
}

async function* chatWithTools(messages, tools) {
  const normalized = normalizeMessages(messages);
  const primary = await resolveModel('chat');

  if (!primary) {
    throw new Error('No chat model configured — assign a model in Admin > Config');
  }

  // If in cloud mode or primary is not Ollama, skip Ollama attempt
  if (_cloudMode || primary.provider !== 'ollama') {
    if (_cloudMode) {
      // Use fallback model when in cloud mode
      const fallback = await resolveModel('chatFallback');
      if (fallback) {
        if (fallback.provider === 'ollama') {
          yield* ollamaChat(normalized, tools, fallback);
        } else {
          yield* cloudChat(normalized, tools, fallback);
        }
        return;
      }
    }
    yield* primary.provider === 'ollama'
      ? ollamaChat(normalized, tools, primary)
      : cloudChat(normalized, tools, primary);
    return;
  }

  // Try Ollama with first-token timeout
  try {
    let gotFirstToken = false;
    const ac = new AbortController();
    const firstTokenTimer = setTimeout(() => {
      if (!gotFirstToken) ac.abort();
    }, FIRST_TOKEN_TIMEOUT_MS);

    try {
      for await (const chunk of ollamaChat(normalized, tools, primary, ac.signal)) {
        if (!gotFirstToken) {
          gotFirstToken = true;
          clearTimeout(firstTokenTimer);
          _errorCount = 0; // reset on success
        }
        yield chunk;
      }
      clearTimeout(firstTokenTimer);
      return;
    } finally {
      clearTimeout(firstTokenTimer);
    }
  } catch (err) {
    _errorCount++;
    const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
    console.warn(`[brain] Ollama failed (${_errorCount}/${MAX_ERRORS}): ${err.message}`);
    if (isTimeout || _errorCount >= MAX_ERRORS) {
      _cloudMode = true;
      console.warn('[brain] Entering cloud fallback mode');
      startProbing();
    }

    // Try fallback for this request
    const fallback = await resolveModel('chatFallback');
    if (fallback) {
      console.warn(`[brain] Using fallback: ${fallback.provider}/${fallback.model}`);
      if (fallback.provider === 'ollama') {
        yield* ollamaChat(normalized, tools, fallback);
      } else {
        yield* cloudChat(normalized, tools, fallback);
      }
      return;
    }
    throw err;
  }
}

async function* ollamaChat(messages, tools, resolved, externalSignal) {
  const { model, ollamaHost } = resolved;
  console.log(`[brain] ollama request: model=${model} host=${ollamaHost}`);

  const body = { model, messages, stream: true };
  if (tools?.length) body.tools = tools;

  // Use external signal if provided, otherwise default 120s timeout
  const signal = externalSignal || AbortSignal.timeout(120000);

  const response = await fetch(`${ollamaHost}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal
  });

  if (!response.ok) throw new Error(`Ollama API error: ${response.status} (model=${model})`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value).split('\n').filter(l => l.trim())) {
      try {
        const data = JSON.parse(line);
        if (data.message?.tool_calls?.length) {
          for (const tc of data.message.tool_calls) {
            yield { type: 'tool_use', id: tc.id || `call_${Date.now()}`, name: tc.function.name, input: typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments, text: '' };
          }
        } else if (data.message?.content) {
          yield { type: 'content', text: data.message.content, done: data.done || false };
        }
      } catch { /* ignore */ }
    }
  }
}

async function* cloudChat(messages, tools, resolved) {
  const { apiKey: cfgKey, baseUrl: cfgBase, model: cfgModel } = resolved;
  const apiKey = cfgKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error(`API key not set for ${resolved.provider || 'cloud'} — configure in Admin > Models`);

  const baseUrl = cfgBase || 'https://api.openai.com/v1';
  const model = cfgModel || 'gpt-4o-mini';

  const body = { model, messages, stream: true };
  if (tools?.length) body.tools = tools.map(t => ({ type: 'function', function: t }));

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error(`Cloud LLM API error: ${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const toolCalls = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))) {
      const data = line.slice(6);
      if (data === '[DONE]') {
        for (const tc of Object.values(toolCalls)) {
          yield { type: 'tool_use', id: tc.id, name: tc.name, input: JSON.parse(tc.args || '{}'), text: '' };
        }
        return;
      }
      try {
        const delta = JSON.parse(data).choices[0]?.delta;
        if (delta?.content) yield { type: 'content', text: delta.content, done: false };
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index;
            if (!toolCalls[idx]) toolCalls[idx] = { id: tc.id, name: tc.function?.name, args: '' };
            if (tc.function?.name) toolCalls[idx].name = tc.function.name;
            if (tc.function?.arguments) toolCalls[idx].args += tc.function.arguments;
          }
        }
      } catch { /* ignore */ }
    }
  }
}

export async function* chat(input, options = {}) {
  const messages = typeof input === 'string'
    ? [...(options.history || []), { role: 'user', content: input }]
    : input;
  const registeredTools = [...tools.entries()].map(([name, fn]) => ({ name, fn }));
  const mergedTools = [...(options.tools || []), ...registeredTools];
  startMark('llm');
  try {
    yield* chatWithTools(messages, mergedTools);
  } catch (err) {
    yield { type: 'error', error: err.message };
  }
  chat._lastMs = endMark('llm');
}

export async function chatSession(sessionId, userMessage, options = {}) {
  const session = getSession(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const messages = [
    { role: 'system', content: session.brainState.systemPrompt },
    ...session.history.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];

  const chunks = [];
  for await (const chunk of chat(messages, options)) {
    if (chunk.type === 'content') chunks.push(chunk.text);
  }
  const response = chunks.join('');

  broadcastSession(sessionId, { role: 'user', content: userMessage, deviceId: options.deviceId });
  broadcastSession(sessionId, { role: 'assistant', content: response, deviceId: 'brain' });

  return response;
}
