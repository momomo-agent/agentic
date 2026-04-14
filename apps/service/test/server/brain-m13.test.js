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

describe('brain.js M13 DBB-003: tool_use yields text field', () => {
  beforeEach(() => {
    vi.resetModules();
    mockEngine = null;
  });

  it('Ollama path: tool_use chunk contains text field (string)', async () => {
    mockEngine = {
      async *run(modelName, input) {
        yield { type: 'tool_use', name: 'myTool', input: { x: 1 }, text: '{"x":1}' };
      }
    };

    const { chat } = await import('../../src/server/core-bridge.js');
    const chunks = [];
    for await (const c of chat([{ role: 'user', content: 'hi' }], { tools: [{ name: 'myTool' }] })) {
      chunks.push(c);
    }

    const toolChunks = chunks.filter(c => c.type === 'tool_use');
    expect(toolChunks.length).toBeGreaterThan(0);
    for (const c of toolChunks) {
      expect(typeof c.text).toBe('string');
    }
  });
});
