import { startMark, endMark } from '../runtime/profiler.js';
import { isCloudMode, setCloudMode, incrementErrors, getErrorCount, startProbing } from './providers.js';

// Import agentic-core
let core;
try {
  core = await import('agentic-core');
} catch {
  const { default: _core } = await import('../../../packages/core/agentic-core.js');
  core = _core;
}

const tools = new Map();
const MAX_ERRORS = 3;

export function registerTool(name, fn) {
  tools.set(name, fn);
  if (core.toolRegistry) {
    core.toolRegistry.register(name, { name, description: `service tool: ${name}`, execute: fn });
  }
}

function hasVisionContent(messages) {
  for (const msg of messages) {
    if (Array.isArray(msg.content)) {
      if (msg.content.some(b => b.type === 'image_url')) return true;
    }
  }
  return false;
}

export async function* chat(input, options = {}) {
  const messages = typeof input === 'string'
    ? [...(options.history || []), { role: 'user', content: input }]
    : input;

  const registeredTools = [...tools.entries()].map(([name, fn]) => ({
    name, description: `service tool: ${name}`,
    parameters: { type: 'object', properties: {} },
    execute: fn,
  }));
  const mergedTools = [...(options.tools || []), ...registeredTools];

  startMark('llm');

  try {
    const needsVision = hasVisionContent(messages);
    const providers = [];

    if (!isCloudMode()) {
      providers.push({ provider: needsVision ? 'local-vision' : 'local' });
    }
    providers.push({ provider: 'cloud-fallback' });

    const iter = core.agenticAsk('', {
      provider: providers[0].provider,
      providers,
      tools: mergedTools,
      history: messages,
      stream: true,
    });

    for await (const chunk of iter) {
      yield chunk;
    }
  } catch (err) {
    const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
    if (!isTimeout) incrementErrors();

    if (isTimeout || getErrorCount() >= MAX_ERRORS) {
      setCloudMode(true);
      startProbing();
      console.log(`[core-bridge] switching to cloud mode (timeout=${isTimeout}, errors=${getErrorCount()})`);
    }

    yield { type: 'error', error: err.message };
  }

  chat._lastMs = endMark('llm');
}
