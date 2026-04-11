import { describe, it, expect, vi, beforeEach } from 'vitest';

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

let mockEngine = null;
vi.mock('../../src/engine/registry.js', () => ({
  resolveModel: vi.fn(async (modelId) => {
    if (mockEngine) return { engineId: 'ollama', engine: mockEngine, model: { name: modelId }, provider: 'ollama', modelName: modelId };
    return null;
  }),
  modelsForCapability: vi.fn(async () => []),
  getEngine: vi.fn(() => mockEngine),
}));

describe('brain.js - DBB-001: tool_use response format (text field)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockEngine = null;
  });

  it('yields chunks with text field (not content) for Ollama path', async () => {
    mockEngine = {
      async *run(modelName, input) {
        yield { type: 'content', text: 'hello' };
        yield { type: 'content', text: ' world' };
        yield { type: 'done' };
      }
    };

    const { chat } = await import('../../src/server/brain.js');
    const chunks = [];
    for await (const chunk of chat([{ role: 'user', content: 'hi' }])) {
      chunks.push(chunk);
    }

    const contentChunks = chunks.filter(c => c.type === 'content');
    expect(contentChunks.length).toBeGreaterThan(0);
    for (const c of contentChunks) {
      expect(c).toHaveProperty('text');
      expect(c).not.toHaveProperty('content');
    }
  });
});
