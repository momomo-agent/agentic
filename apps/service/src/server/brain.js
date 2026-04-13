import { getConfig, getAssignments, onConfigChange } from '../config.js';
import { resolveModel as registryResolve, modelsForCapability, getEngine } from '../engine/registry.js';
import { getSession, broadcastSession } from './hub.js';
import { startMark, endMark } from '../runtime/profiler.js';

const tools = new Map();
let _config = null;

// Cloud fallback state
let _cloudMode = false;
let _errorCount = 0;
let _probeTimer = null;
const FIRST_TOKEN_TIMEOUT_MS = 5000;
const FIRST_TOKEN_TIMEOUT_VISION_MS = 30000;
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
 * Resolve a model for a given slot via Engine Registry.
 * Returns { engine, engineId, modelName, provider } or null.
 */
async function resolveModel(slot = 'chat') {
  const config = await ensureConfig();
  const assignments = config.assignments || {};
  const modelId = assignments[slot];

  // 1. Try assigned model via registry
  if (modelId) {
    const resolved = await registryResolve(modelId);
    if (resolved) return resolved;
  }

  // 2. Try engine discovery for the capability
  const cap = slot === 'chatFallback' ? 'chat' : slot;
  const models = await modelsForCapability(cap);
  if (models.length > 0) {
    const resolved = await registryResolve(models[0].id);
    if (resolved) return resolved;
  }

  // 3. Fallback to legacy config.llm format
  if (slot === 'chat' && config.llm?.model) {
    // Try to resolve through registry (ollama engine may know this model)
    const resolved = await registryResolve(config.llm.model);
    if (resolved) return resolved;

    // Last resort: construct a manual resolution for ollama
    const engine = getEngine('ollama');
    if (engine && (config.llm.provider === 'ollama' || !config.llm.provider)) {
      return { engineId: 'ollama', engine, model: { name: config.llm.model }, provider: 'ollama', modelName: config.llm.model };
    }
  }

  return null;
}

// Check if messages contain multimodal content (images)
function hasVisionContent(messages) {
  for (const msg of messages) {
    if (Array.isArray(msg.content)) {
      if (msg.content.some(b => b.type === 'image_url')) return true;
    }
  }
  return false;
}

async function* chatWithTools(messages, toolDefs) {
  // If messages contain images, prefer vision model
  const needsVision = hasVisionContent(messages);
  let resolved;

  if (_cloudMode) {
    resolved = await resolveModel('chatFallback');
  } else if (needsVision) {
    resolved = await resolveModel('vision') || await resolveModel('chat');
  } else {
    resolved = await resolveModel('chat');
  }

  if (!resolved) {
    // Try cloud fallback if no chat model
    if (!_cloudMode) {
      const fallback = await resolveModel('chatFallback');
      if (fallback) {
        yield* callEngine(fallback, messages, toolDefs);
        return;
      }
    }
    throw new Error('No chat model configured');
  }

  try {
    yield* callEngine(resolved, messages, toolDefs);
  } catch (err) {
    const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
    if (!isTimeout) _errorCount++;

    if (isTimeout || _errorCount >= MAX_ERRORS) {
      _cloudMode = true;
      startProbing();
      console.log(`[brain] switching to cloud mode (timeout=${isTimeout}, errors=${_errorCount})`);

      const fallback = await resolveModel('chatFallback');
      if (fallback) {
        yield* callEngine(fallback, messages, toolDefs);
        return;
      }
    }
    throw err;
  }
}

async function* callEngine(resolved, messages, toolDefs) {
  const { engine, modelName } = resolved;

  if (!engine.run) {
    throw new Error(`Engine ${resolved.engineId} has no run() method`);
  }

  const input = { messages };
  if (toolDefs?.length) {
    input.tools = toolDefs.map(t => {
      // Support both flat { name, description, parameters } and OpenAI { type: 'function', function: { ... } }
      const fn = t.function || t;
      return {
        name: fn.name,
        description: fn.description || '',
        parameters: fn.parameters || {},
      };
    });
  }

  let gotFirstToken = false;
  const ac = new AbortController();
  const timeoutMs = hasVisionContent(messages) ? FIRST_TOKEN_TIMEOUT_VISION_MS : FIRST_TOKEN_TIMEOUT_MS;
  const firstTokenTimer = setTimeout(() => {
    if (!gotFirstToken) ac.abort();
  }, timeoutMs);

  try {
    for await (const chunk of engine.run(modelName, input)) {
      if (!gotFirstToken) {
        gotFirstToken = true;
        clearTimeout(firstTokenTimer);
        _errorCount = 0;
      }

      // Execute registered tools
      if (chunk.type === 'tool_use') {
        const fn = tools.get(chunk.name);
        if (fn) {
          try {
            const result = await fn(chunk.input);
            yield { type: 'tool_use', name: chunk.name, input: chunk.input, text: chunk.text, result };
          } catch (e) {
            yield { type: 'tool_use', name: chunk.name, input: chunk.input, text: chunk.text, error: e.message };
          }
          continue;
        }
        // Pass through tool_use chunk as-is when no registered handler
        yield { type: 'tool_use', name: chunk.name, input: chunk.input, text: chunk.text };
        continue;
      }

      yield chunk;
    }
  } finally {
    clearTimeout(firstTokenTimer);
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
