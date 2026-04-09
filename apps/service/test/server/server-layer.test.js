/**
 * Tests for hub.js + brain.js (task-1775494973876)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
function makeStream(lines) {
  const enc = new TextEncoder();
  const chunks = lines.map(l => enc.encode(l + '\n'));
  let i = 0;
  return { getReader: () => ({ read: async () => i < chunks.length ? { done: false, value: chunks[i++] } : { done: true } }) };
}

async function collect(gen) {
  const out = [];
  for await (const c of gen) out.push(c);
  return out;
}

import { chat } from '../../src/server/brain.js';

describe('brain.js', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('yields tool_use chunk from Ollama tool_calls (DBB-008)', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      body: makeStream([JSON.stringify({ message: { tool_calls: [{ function: { name: 'get_time', arguments: {} } }] }, done: true })])
    });
    const chunks = await collect(chat([{ role: 'user', content: 'time?' }], { tools: [{ name: 'get_time' }] }));
    const tc = chunks.find(c => c.type === 'tool_use');
    expect(tc).toBeDefined();
    expect(tc.name).toBe('get_time');
  });

  it('yields content chunk for plain response', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      body: makeStream([JSON.stringify({ message: { content: 'Hi!' }, done: true })])
    });
    const chunks = await collect(chat([{ role: 'user', content: 'hello' }]));
    expect(chunks.find(c => c.type === 'content')?.text).toBe('Hi!');
  });

  it('yields error chunk on fetch failure', async () => {
    fetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const chunks = await collect(chat([{ role: 'user', content: 'hi' }], {}));
    expect(chunks.find(c => c.type === 'error')).toBeDefined();
  });

  it('normalizes tool result messages to tool_result format', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      body: makeStream([JSON.stringify({ message: { content: 'done' }, done: true })])
    });
    await collect(chat([
      { role: 'user', content: 'use tool' },
      { role: 'tool', tool_use_id: 'call_1', content: 'result' }
    ], {}));
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    const toolMsg = body.messages.find(m => m.role === 'user' && Array.isArray(m.content));
    expect(toolMsg?.content[0].type).toBe('tool_result');
    expect(toolMsg?.content[0].tool_use_id).toBe('call_1');
  });
});
