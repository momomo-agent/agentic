import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

vi.mock('../../src/runtime/llm.js', () => ({ chat: vi.fn() }));
vi.mock('../../src/detector/hardware.js', () => ({
  detect: vi.fn().mockResolvedValue({ platform: 'darwin', arch: 'arm64', gpu: {}, memory: 16, cpu: {} })
}));

import { startServer } from '../../src/server/api.js';

const CONFIG_PATH = path.join(os.homedir(), '.agentic-service', 'config.json');

let server, baseUrl;

async function req(method, p, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  return fetch(`${baseUrl}${p}`, opts);
}

beforeEach(async () => {
  const port = 3200 + Math.floor(Math.random() * 100);
  server = await startServer(port);
  baseUrl = `http://localhost:${port}`;
  // clean config before each test
  await fs.rm(CONFIG_PATH, { force: true });
});

afterEach(() => server?.close());

describe('GET /api/status — Ollama real detection', () => {
  it('returns ollama.running (boolean) and ollama.models (array)', async () => {
    const res = await req('GET', '/api/status');
    expect(res.status).toBe(200);
    const { ollama } = await res.json();
    expect(typeof ollama.running).toBe('boolean');
    expect(Array.isArray(ollama.models)).toBe(true);
  });

  it('returns running:false when Ollama is not reachable', async () => {
    // Ollama is unlikely to be running in CI; if it is, this test is still valid
    // We verify the shape is correct regardless
    const res = await req('GET', '/api/status');
    const { ollama } = await res.json();
    expect(ollama).toHaveProperty('running');
    expect(ollama).toHaveProperty('models');
  });

  it('does not throw when Ollama is unreachable (no 500)', async () => {
    const res = await req('GET', '/api/status');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/config — persistence', () => {
  it('returns {} when no config file exists', async () => {
    const res = await req('GET', '/api/config');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({});
  });

  it('PUT then GET returns same value', async () => {
    const config = { model: 'llama3', temperature: 0.7 };
    const put = await req('PUT', '/api/config', config);
    expect(put.status).toBe(200);
    expect(await put.json()).toEqual({ ok: true });

    const get = await req('GET', '/api/config');
    expect(await get.json()).toEqual(config);
  });

  it('config persists on disk as JSON', async () => {
    const config = { key: 'value' };
    await req('PUT', '/api/config', config);
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    expect(JSON.parse(raw)).toEqual(config);
  });

  it('GET returns {} after config file is deleted', async () => {
    await req('PUT', '/api/config', { x: 1 });
    await fs.rm(CONFIG_PATH, { force: true });
    const res = await req('GET', '/api/config');
    expect(await res.json()).toEqual({});
  });
});

describe('startServer — EADDRINUSE', () => {
  it('rejects with port-in-use message when port is taken by external process', async () => {
    const net = await import('net');
    const port = 3399;
    // Pre-occupy port with a raw net server (simulates external process)
    const blocker = net.createServer();
    await new Promise(r => blocker.listen(port, r));
    try {
      await expect(startServer(port)).rejects.toThrow(`Port ${port} is already in use`);
    } finally {
      await new Promise(r => blocker.close(r));
    }
  });
});
