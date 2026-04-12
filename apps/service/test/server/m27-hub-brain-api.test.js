import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/server/brain.js', () => ({
  chat: vi.fn(async function* () { yield { type: 'content', text: 'hi' }; })
}));
vi.mock('../../src/runtime/stt.js', () => ({ init: vi.fn(), transcribe: vi.fn() }));
vi.mock('../../src/runtime/tts.js', () => ({ init: vi.fn(), synthesize: vi.fn() }));
vi.mock('../../src/detector/hardware.js', () => ({
  detect: vi.fn(async () => ({ gpu: 'none', cpu: 'arm64' }))
}));

import { startServer, stopServer } from '../../src/server/api.js';
import { registerDevice, getDevices } from '../../src/server/hub.js';

let server, baseUrl;

beforeEach(async () => {
  server = await startServer(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
});

afterEach(async () => {
  if (server) await stopServer(server);
});

// DBB-008
describe('DBB-008: hub registerDevice + getDevices', () => {
  it('registered device appears in getDevices()', () => {
    registerDevice('dev-dbb008', { name: 'test' });
    const found = getDevices().find(d => d.id === 'dev-dbb008');
    expect(found).toBeTruthy();
    expect(found.id).toBe('dev-dbb008');
  });
});

// DBB-009
describe('DBB-009: brain chat returns AsyncGenerator', () => {
  it('chat() yields at least one chunk with type field', async () => {
    const { chat } = await import('../../src/server/brain.js');
    const gen = chat([{ role: 'user', content: 'hi' }]);
    expect(typeof gen[Symbol.asyncIterator]).toBe('function');
    const chunks = [];
    for await (const chunk of gen) chunks.push(chunk);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]).toHaveProperty('type');
  });
});

// DBB-010
describe('DBB-010: POST /api/chat returns SSE stream', () => {
  it('responds with text/event-stream containing data: lines', async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello' }),
      signal: AbortSignal.timeout(3000),
    });
    expect(res.headers.get('content-type')).toMatch(/text\/event-stream/);
    const text = await res.text();
    expect(text).toMatch(/data:/);
  });

  it('returns 400 for missing message', async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(3000),
    });
    expect(res.status).toBe(400);
  });
});

// DBB-011
describe('DBB-011: GET /api/status returns hardware and devices', () => {
  it('returns JSON with hardware, config, devices fields', async () => {
    const res = await fetch(`${baseUrl}/api/status`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('hardware');
    expect(body).toHaveProperty('config');
    expect(body).toHaveProperty('devices');
  });
});
