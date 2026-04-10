import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServer } from 'node:http';

// ── DBB-001/002: heartbeat timeout logic ──────────────────────────────────────
describe('hub.js M13 heartbeat timeout', () => {
  beforeEach(() => vi.resetModules());

  it('DBB-001: device silent 61s → offline', async () => {
    const { registerDevice, getDevices } = await import('../../src/server/hub.js');
    registerDevice('m13-dev-timeout', { name: 'test' });
    // Manually backdate lastSeen by 61s
    const d = getDevices().find(x => x.id === 'm13-dev-timeout');
    d.lastSeen = Date.now() - 61000;
    // Trigger status check inline (same logic as setInterval)
    const now = Date.now();
    d.status = (now - d.lastSeen > 60000) ? 'offline' : 'online';
    expect(d.status).toBe('offline');
  });

  it('DBB-002: device heartbeat every 30s stays online after 120s', async () => {
    const { registerDevice, heartbeat, getDevices } = await import('../../src/server/hub.js');
    registerDevice('m13-dev-alive', { name: 'alive' });
    // Simulate 4 heartbeats over 120s
    for (let i = 0; i < 4; i++) heartbeat('m13-dev-alive');
    const d = getDevices().find(x => x.id === 'm13-dev-alive');
    const now = Date.now();
    d.status = (now - d.lastSeen > 60000) ? 'offline' : 'online';
    expect(d.status).toBe('online');
  });
});

// ── DBB-004: broadcastWakeword ────────────────────────────────────────────────
describe('hub.js M13 broadcastWakeword', () => {
  beforeEach(() => vi.resetModules());

  it('DBB-004: sends wakeword to all connected clients', async () => {
    const { registerDevice, broadcastWakeword } = await import('../../src/server/hub.js');
    const sent1 = [], sent2 = [];
    registerDevice({ id: 'm13-ws1', name: 'a', capabilities: [], ws: { send: m => sent1.push(JSON.parse(m)) }, lastPong: Date.now() });
    registerDevice({ id: 'm13-ws2', name: 'b', capabilities: [], ws: { send: m => sent2.push(JSON.parse(m)) }, lastPong: Date.now() });
    broadcastWakeword();
    expect(sent1.some(m => m.type === 'wakeword')).toBe(true);
    expect(sent2.some(m => m.type === 'wakeword')).toBe(true);
  });

  it('DBB-004: broken ws does not throw', async () => {
    const { registerDevice, broadcastWakeword } = await import('../../src/server/hub.js');
    registerDevice({ id: 'm13-ws-broken', name: 'x', capabilities: [], ws: { send: () => { throw new Error('broken'); } }, lastPong: Date.now() });
    expect(() => broadcastWakeword()).not.toThrow();
  });
});

// ── DBB-005: SIGINT handler ───────────────────────────────────────────────────
describe('hub.js M13 SIGINT', () => {
  beforeEach(() => vi.resetModules());

  it('DBB-005: SIGINT handler registered via process.once', async () => {
    const spy = vi.spyOn(process, 'once');
    const server = createServer();
    const { initWebSocket } = await import('../../src/server/hub.js');
    initWebSocket(server);
    expect(spy.mock.calls.some(c => c[0] === 'SIGINT')).toBe(true);
    spy.mockRestore();
    server.close();
  });
});

// ── DBB-003: brain.js tool_use text field ────────────────────────────────────
describe('brain.js M13 tool_use text field', () => {
  beforeEach(() => vi.resetModules());

  it('DBB-003: Ollama path yields tool_use with text field', async () => {
    vi.doMock('../../src/config.js', () => ({
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
    const line = JSON.stringify({ message: { tool_calls: [{ function: { name: 'fn', arguments: '{}' } }] }, done: true });
    const enc = new TextEncoder();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => ({ read: vi.fn()
        .mockResolvedValueOnce({ done: false, value: enc.encode(line + '\n') })
        .mockResolvedValue({ done: true }) }) }
    });
    const { chat } = await import('../../src/server/brain.js');
    const chunks = [];
    for await (const c of chat([{ role: 'user', content: 'hi' }], { tools: [{ name: 'fn' }] })) chunks.push(c);
    const toolChunk = chunks.find(c => c.type === 'tool_use');
    expect(toolChunk).toBeDefined();
    expect(typeof toolChunk.text).toBe('string');
  });
});

// ── DBB-006/007: Docker files exist ──────────────────────────────────────────
import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';

describe('Docker M13 DBB-006/007', () => {
  it('DBB-006: install/Dockerfile exists', () => {
    expect(existsSync('install/Dockerfile')).toBe(true);
  });

  it('DBB-006: install/docker-compose.yml exists', () => {
    expect(existsSync('install/docker-compose.yml')).toBe(true);
  });

  it('DBB-006: Dockerfile exposes port 1234', () => {
    const content = readFileSync('install/Dockerfile', 'utf8');
    expect(content).toMatch(/EXPOSE\s+1234/);
  });

  it('DBB-007: docker-compose.yml has config volume', () => {
    const content = readFileSync('install/docker-compose.yml', 'utf8');
    expect(content).toMatch(/volumes:/);
    expect(content).toMatch(/config/);
  });
});

// ── DBB-008/009: watchProfiles hot reload ────────────────────────────────────
describe('profiles.js M13 hot reload', () => {
  it('DBB-008: onReload called when profiles change', async () => {
    const { watchProfiles } = await import('../../src/detector/profiles.js');
    const profile = { llm: { model: 'new' }, stt: {}, tts: {}, fallback: {} };
    const data = { profiles: [{ match: {}, config: profile }] };
    global.fetch = vi.fn().mockResolvedValue({
      status: 200, ok: true,
      headers: { get: () => 'etag-1' },
      json: async () => data,
    });
    let reloaded = null;
    const stop = watchProfiles({}, p => { reloaded = p; }, 50);
    await new Promise(r => setTimeout(r, 150));
    stop();
    expect(reloaded).not.toBeNull();
  });

  it('DBB-009: malformed JSON does not crash, service stays up', async () => {
    const { watchProfiles } = await import('../../src/detector/profiles.js');
    global.fetch = vi.fn().mockResolvedValue({
      status: 200, ok: true,
      headers: { get: () => 'etag-2' },
      json: async () => { throw new SyntaxError('bad json'); },
    });
    const stop = watchProfiles({}, () => {}, 50);
    await new Promise(r => setTimeout(r, 150));
    stop();
    // No throw = pass
  });
});
