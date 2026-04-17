import { startMark, endMark } from '../runtime/profiler.js';
import { resolveModel, modelsForCapability } from '../engine/registry.js';
import { getConfig } from '../config.js';

const tools = new Map();

export function registerTool(name, fn) {
  tools.set(name, fn);
}

function hasVisionContent(messages) {
  for (const msg of messages) {
    if (Array.isArray(msg.content) && msg.content.some(b => b.type === 'image_url')) return true;
  }
  return false;
}

const _modelCache = new Map(); // slot → { resolved, ts }
const MODEL_CACHE_TTL = 30_000;

async function findModel(slot) {
  const cached = _modelCache.get(slot);
  if (cached && Date.now() - cached.ts < MODEL_CACHE_TTL) return cached.resolved;

  const config = await getConfig();
  const assigned = config.assignments?.[slot];
  if (assigned) {
    const r = await resolveModel(assigned);
    if (r) { _modelCache.set(slot, { resolved: r, ts: Date.now() }); return r; }
  }
  const cap = slot === 'chatFallback' ? 'chat' : slot;
  const models = await modelsForCapability(cap);
  if (models.length > 0) {
    const r = await resolveModel(models[0].id);
    if (r) { _modelCache.set(slot, { resolved: r, ts: Date.now() }); return r; }
  }
  return null;
}

export async function* chat(input, options = {}) {
  const messages = typeof input === 'string'
    ? [...(options.history || []), { role: 'user', content: input }]
    : input;

  startMark('llm');

  const slot = hasVisionContent(messages) ? 'vision' : 'chat';
  let resolved = await findModel(slot);
  if (!resolved && slot === 'vision') resolved = await findModel('chat');

  if (!resolved) {
    yield { type: 'error', error: 'No local model available' };
    endMark('llm');
    return;
  }

  const { engine, modelName } = resolved;
  const runInput = { messages };

  const mergedTools = [
    ...(options.tools || []),
    ...[...tools.entries()].map(([name, fn]) => ({
      name, description: `service tool: ${name}`, parameters: { type: 'object', properties: {} }, execute: fn,
    })),
  ];
  if (mergedTools.length > 0) {
    runInput.tools = mergedTools.map(t => {
      // Handle OpenAI function-calling format: { type: "function", function: { name, description, parameters } }
      const fn = t.function || t;
      return { name: fn.name, description: fn.description || '', parameters: fn.parameters || {} };
    });
  }

  try {
    for await (const chunk of engine.run(modelName, runInput)) {
      if (chunk.type === 'content') yield { type: 'text_delta', text: chunk.text };
      else if (chunk.type === 'tool_use') yield chunk;
    }
  } catch (err) {
    console.error('[core-bridge] engine error:', err.message);
    let userMessage = err.message;
    if (err.name === 'AbortError' || /aborted/i.test(err.message)) {
      userMessage = `Model timed out — ${modelName} may still be loading into memory. Try again in a few seconds.`;
    } else if (/ECONNREFUSED/i.test(err.message)) {
      userMessage = `Cannot connect to Ollama (${resolved.provider}). Is it running?`;
    } else if (/fetch failed/i.test(err.message)) {
      userMessage = `Lost connection to model engine. Check if Ollama is still running.`;
    }
    yield { type: 'error', error: userMessage };
  }

  chat._lastMs = endMark('llm');
}
