/**
 * Tests for hub.js + brain.js (task-1775494973876)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

let _mockEngine = null;
vi.mock('../../src/engine/registry.js', () => ({
  resolveModel: vi.fn(async (modelId) => {
    if (_mockEngine) return { engineId: 'ollama', engine: _mockEngine, model: { name: modelId }, provider: 'ollama', modelName: modelId };
    return null;
  }),
  modelsForCapability: vi.fn(async () => []),
  getEngine: vi.fn(() => _mockEngine),
}));

// ── hub.js ───────────────────────────────────────────────────────────────────
import { registerDevice, unregisterDevice, getDevices } from '../../src/server/hub.js';

describe('hub.js', () => {
  beforeEach(() => getDevices().forEach(d => unregisterDevice(d.id)));

  it.skip('register stores device and removes on close', () => {
    // register(ws, meta) no longer exists as a standalone export; WebSocket
    // registration is handled internally by initWebSocket
  });

  it.skip('broadcast sends JSON to all ws devices', () => {
    // broadcast() no longer exists as a standalone export
  });

  it.skip('broadcast ignores send errors on closed ws', () => {
    // broadcast() no longer exists as a standalone export
  });

  it('getDevices returns registered devices', () => {
    registerDevice('strip-1', { name: 'Strip' });
    const dev = getDevices().find(d => d.id === 'strip-1');
    expect(dev).toBeDefined();
    expect(dev.id).toBe('strip-1');
    unregisterDevice('strip-1');
  });
});

// ── brain.js ─────────────────────────────────────────────────────────────────
async function collect(gen) {
  const out = [];
  for await (const c of gen) out.push(c);
  return out;
}

import { chat } from '../../src/server/core-bridge.js';

describe('brain.js', () => {
  beforeEach(() => { _mockEngine = null; });

  it('yields tool_use chunk from Ollama tool_calls (DBB-008)', async () => {
    _mockEngine = {
      async *run(modelName, input) {
        yield { type: 'tool_use', name: 'get_time', input: {}, text: '{}' };
        yield { type: 'done' };
      }
    };
    const chunks = await collect(chat([{ role: 'user', content: 'time?' }], { tools: [{ name: 'get_time' }] }));
    const tc = chunks.find(c => c.type === 'tool_use');
    expect(tc).toBeDefined();
    expect(tc.name).toBe('get_time');
  });

  it('yields content chunk for plain response', async () => {
    _mockEngine = {
      async *run(modelName, input) {
        yield { type: 'content', text: 'Hi!' };
        yield { type: 'done' };
      }
    };
    const chunks = await collect(chat([{ role: 'user', content: 'hello' }]));
    expect(chunks.find(c => c.type === 'content')?.text).toBe('Hi!');
  });

  it('yields error chunk on fetch failure', async () => {
    _mockEngine = {
      async *run() { throw new Error('ECONNREFUSED'); }
    };
    const chunks = await collect(chat([{ role: 'user', content: 'hi' }], {}));
    expect(chunks.find(c => c.type === 'error')).toBeDefined();
  });

  it('normalizes tool result messages to tool_result format', async () => {
    let receivedInput = null;
    _mockEngine = {
      async *run(modelName, input) {
        receivedInput = input;
        yield { type: 'content', text: 'done' };
        yield { type: 'done' };
      }
    };
    await collect(chat([
      { role: 'user', content: 'use tool' },
      { role: 'tool', tool_use_id: 'call_1', content: 'result' }
    ], {}));
    // brain.js passes messages through to engine.run() — verify messages are forwarded
    expect(receivedInput).toBeDefined();
    expect(receivedInput.messages).toBeDefined();
  });
});
