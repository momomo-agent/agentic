import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config
vi.mock('../../src/config.js', () => ({
  getConfig: vi.fn(async () => ({
    llm: { provider: 'ollama', model: 'test-model' },
    ollamaHost: 'http://localhost:11434',
    assignments: { chat: null, chatFallback: null },
    modelPool: [],
  })),
  getAssignments: vi.fn(async () => ({ chat: null, chatFallback: null })),
  onConfigChange: vi.fn(),
}));

// Helper to create a mock engine with run() that streams NDJSON-like chunks
function makeMockEngine(lines) {
  return {
    async *run(modelName, input) {
      for (const line of lines) {
        const json = typeof line === 'string' ? JSON.parse(line) : line;
        if (json.message?.tool_calls?.length) {
          for (const tc of json.message.tool_calls) {
            const args = typeof tc.function.arguments === 'string'
              ? JSON.parse(tc.function.arguments) : tc.function.arguments;
            yield { type: 'tool_use', name: tc.function.name, input: args, text: JSON.stringify(args) };
          }
        }
        if (json.message?.content) {
          yield { type: 'content', text: json.message.content };
        }
        if (json.done) {
          yield { type: 'done' };
        }
      }
    }
  };
}

// Mock registry — returns a mock ollama engine for legacy config.llm fallback
let mockEngine = null;
vi.mock('../../src/engine/registry.js', () => ({
  resolveModel: vi.fn(async (modelId) => {
    if (mockEngine) return { engineId: 'ollama', engine: mockEngine, model: { name: modelId }, provider: 'ollama', modelName: modelId };
    return null;
  }),
  modelsForCapability: vi.fn(async () => []),
  getEngine: vi.fn((id) => mockEngine),
}));

// Helper to collect all chunks from the chat generator
async function collect(gen) {
  const chunks = [];
  for await (const chunk of gen) chunks.push(chunk);
  return chunks;
}

import { chat } from '../../src/server/brain.js';

describe('brain.js — DBB-008: tool_use chunks', () => {
  beforeEach(() => { mockEngine = null; });

  it('yields tool_use chunk when Ollama returns tool_calls', async () => {
    mockEngine = makeMockEngine([
      { message: { tool_calls: [{ function: { name: 'get_weather', arguments: { city: 'NYC' } } }] }, done: true }
    ]);

    const messages = [{ role: 'user', content: 'What is the weather in NYC?' }];
    const tools = [{ name: 'get_weather', description: 'Get weather', parameters: { type: 'object', properties: { city: { type: 'string' } } } }];
    const chunks = await collect(chat(messages, { tools }));

    const toolChunk = chunks.find(c => c.type === 'tool_use');
    expect(toolChunk).toBeDefined();
    expect(toolChunk.name).toBe('get_weather');
    expect(toolChunk.input).toEqual({ city: 'NYC' });
  });
});

describe('brain.js — DBB-009: content chunks without tools', () => {
  beforeEach(() => { mockEngine = null; });

  it('yields content chunk when no tools provided', async () => {
    mockEngine = makeMockEngine([
      { message: { content: 'Hello there!' }, done: true }
    ]);

    const messages = [{ role: 'user', content: 'Hi' }];
    const chunks = await collect(chat(messages, {}));

    const contentChunk = chunks.find(c => c.type === 'content');
    expect(contentChunk).toBeDefined();
    expect(contentChunk.text).toBe('Hello there!');
  });
});

describe('brain.js — error handling', () => {
  beforeEach(() => { mockEngine = null; });

  it('yields error chunk when engine is unreachable and no tools', async () => {
    mockEngine = {
      async *run() { throw new Error('ECONNREFUSED'); }
    };

    const chunks = await collect(chat([{ role: 'user', content: 'Hi' }], ));
    const errChunk = chunks.find(c => c.type === 'error');
    expect(errChunk).toBeDefined();
    expect(errChunk.error).toBeTruthy();
  });

  it('falls back to cloud when engine fails with tools (no fallback → error chunk)', async () => {
    mockEngine = {
      async *run() { throw new Error('engine error'); }
    };

    const tools = [{ name: 'test_tool', description: 'test' }];
    const chunks = await collect(chat([{ role: 'user', content: 'use tool' }], { tools }));
    const errChunk = chunks.find(c => c.type === 'error');
    expect(errChunk).toBeDefined();
  });
});
