import { getConfig, onConfigChange } from '../config.js';
import { resolveModel as registryResolve, modelsForCapability, getEngine } from '../engine/registry.js';

// Import agentic-core (UMD → ESM: exports land on .default)
let core;
try {
  const mod = await import('agentic-core');
  core = mod.default || mod;
} catch {
  const mod = await import('../../../packages/core/agentic-core.js');
  core = mod.default || mod;
}

let _config = null;
let _cloudMode = false;
let _errorCount = 0;
let _probeTimer = null;
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
  console.log('[providers] config reloaded');
});

function startProbing() {
  if (_probeTimer) return;
  _probeTimer = setInterval(async () => {
    try {
      const config = await ensureConfig();
      const ollamaHost = config.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434';
      const res = await fetch(`${ollamaHost}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        console.log('[providers] Ollama probe succeeded, restoring local');
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

export function isCloudMode() { return _cloudMode; }
export function setCloudMode(val) { _cloudMode = val; }
export function incrementErrors() { _errorCount++; }
export function getErrorCount() { return _errorCount; }
export { startProbing };

/**
 * Resolve a model for a given slot via Engine Registry.
 */
async function resolveModel(slot = 'chat') {
  const config = await ensureConfig();
  const assignments = config.assignments || {};
  const modelId = assignments[slot];

  if (modelId) {
    const resolved = await registryResolve(modelId);
    if (resolved) return resolved;
  }

  const cap = slot === 'chatFallback' ? 'chat' : slot;
  const models = await modelsForCapability(cap);
  if (models.length > 0) {
    const resolved = await registryResolve(models[0].id);
    if (resolved) return resolved;
  }

  if (slot === 'chat' && config.llm?.model) {
    const resolved = await registryResolve(config.llm.model);
    if (resolved) return resolved;
    const engine = getEngine('ollama');
    if (engine && (config.llm.provider === 'ollama' || !config.llm.provider)) {
      return { engineId: 'ollama', engine, model: { name: config.llm.model }, provider: 'ollama', modelName: config.llm.model };
    }
  }

  return null;
}

/**
 * Bridge: register local engines as core custom providers.
 */
function registerEngineAsProvider(name, engineResolveFn) {
  if (!core.registerProvider) return;

  core.registerProvider(name, async function* ({ messages, tools: toolDefs, system, signal }) {
    const resolved = await engineResolveFn();
    if (!resolved?.engine?.run) throw new Error(`Engine not available for provider "${name}"`);

    const { engine, modelName } = resolved;
    const input = { messages };
    if (toolDefs?.length) {
      input.tools = toolDefs.map(t => {
        const fn = t.function || t;
        return { name: fn.name, description: fn.description || '', parameters: fn.parameters || {} };
      });
    }

    for await (const chunk of engine.run(modelName, input)) {
      if (chunk.type === 'content') {
        yield { type: 'text_delta', text: chunk.text || '' };
      } else if (chunk.type === 'tool_use') {
        yield { type: 'tool_use', id: chunk.id || `call_${Date.now()}`, name: chunk.name, input: chunk.input };
      }
    }
  });
}

/**
 * Register local + cloud engines as core providers.
 */
export async function initProviders() {
  registerEngineAsProvider('local', async () => {
    if (_cloudMode) return null;
    return await resolveModel('chat');
  });

  registerEngineAsProvider('local-vision', async () => {
    if (_cloudMode) return null;
    return await resolveModel('vision') || await resolveModel('chat');
  });

  registerEngineAsProvider('cloud-fallback', async () => {
    return await resolveModel('chatFallback');
  });
}

// Initialize on first import
initProviders();
