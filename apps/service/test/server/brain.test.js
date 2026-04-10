import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config to provide a model so brain.js doesn't throw "No chat model configured"
vi.mock('../../src/config.js', () => ({
  getConfig: vi.fn(async () => ({
    llm: { provider: 'ollama', model: 'test-model' },
    ollamaHost: 'http://localhost:11434',
    assignments: { chat: null, chatFallback: null },
    modelPool: [],
  })),
  getModelPool: vi.fn(async () => []),
  getAssignments: vi.fn(async () => ({ chat: null, chatFallback: null })),
  onConfigChange: vi.fn(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create a readable stream from NDJSON lines
function makeStream(lines) {
  const encoder = new TextEncoder();
  const chunks = lines.map(l => encoder.encode(l + '\n'));
  let i = 0;
  return {
    getReader() {
      return {
        read: async () => i < chunks.length
          ? { done: false, value: chunks[i++] }
          : { done: true, value: undefined }
      };
    }
  };
}

// Helper to collect all chunks from the chat generator
async function collect(gen) {
  const chunks = [];
  for await (const chunk of gen) chunks.push(chunk);
  return chunks;
}

import { chat } from '../../src/server/brain.js';

describe('brain.js — DBB-008: tool_use chunks', () => {
  beforeEach(() => mockFetch.mockReset());

  it('yields tool_use chunk when Ollama returns tool_calls', async () => {
    const ollamaLine = JSON.stringify({
      message: { tool_calls: [{ function: { name: 'get_weather', arguments: { city: 'NYC' } } }] },
      done: true
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: makeStream([ollamaLine])
    });

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
  beforeEach(() => mockFetch.mockReset());

  it('yields content chunk when no tools provided', async () => {
    const ollamaLine = JSON.stringify({
      message: { content: 'Hello there!' },
      done: true
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: makeStream([ollamaLine])
    });

    const messages = [{ role: 'user', content: 'Hi' }];
    const chunks = await collect(chat(messages, {}));

    const contentChunk = chunks.find(c => c.type === 'content');
    expect(contentChunk).toBeDefined();
    expect(contentChunk.text).toBe('Hello there!');
  });
});

describe('brain.js — error handling', () => {
  beforeEach(() => mockFetch.mockReset());

  it('yields error chunk when Ollama is unreachable and no tools', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const chunks = await collect(chat([{ role: 'user', content: 'Hi' }], ));
    const errChunk = chunks.find(c => c.type === 'error');
    expect(errChunk).toBeDefined();
    expect(errChunk.error).toBeTruthy();
  });

  it('falls back to cloud when Ollama fails with tools (no API key → error chunk)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Ollama tool_use unsupported'));
    delete process.env.OPENAI_API_KEY;

    const tools = [{ name: 'test_tool', description: 'test' }];
    const chunks = await collect(chat([{ role: 'user', content: 'use tool' }], { tools }));
    const errChunk = chunks.find(c => c.type === 'error');
    expect(errChunk).toBeDefined();
  });
});
