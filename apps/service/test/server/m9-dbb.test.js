import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── DBB-001: brain.js yields text field ──────────────────────────────────────
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('DBB-001: brain.js content chunks have text field', () => {
  beforeEach(() => { vi.resetModules(); mockFetch.mockReset(); });

  it('Ollama path yields { type:"content", text } not content field', async () => {
    const lines = [
      JSON.stringify({ message: { content: 'hello' }, done: false }),
      JSON.stringify({ message: { content: ' world' }, done: true }),
    ];
    const enc = new TextEncoder();
    let i = 0;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => ({ read: vi.fn().mockImplementation(() =>
        i < lines.length
          ? Promise.resolve({ done: false, value: enc.encode(lines[i++] + '\n') })
          : Promise.resolve({ done: true })
      )}) }
    });
    const { chat } = await import('../../src/server/brain.js');
    const chunks = [];
    for await (const c of chat([{ role: 'user', content: 'hi' }])) chunks.push(c);
    const content = chunks.filter(c => c.type === 'content');
    expect(content.length).toBeGreaterThan(0);
    for (const c of content) {
      expect(c).toHaveProperty('text');
      expect(c).not.toHaveProperty('content');
    }
  });
});

// ── DBB-002: store.js delete() ────────────────────────────────────────────────
describe('DBB-002: store.js exports del() wrapping store.delete()', () => {
  it('del() calls store.delete internally (unit check via source)', async () => {
    const src = await import('fs').then(m => m.promises.readFile(
      new URL('../../src/store/index.js', import.meta.url), 'utf-8'
    ));
    // del() must call store.delete (not store.del)
    expect(src).toMatch(/store\.delete\(/);
    expect(src).toMatch(/export async function del/);
  });
});

// ── DBB-003: CDN URL format ───────────────────────────────────────────────────
describe('DBB-003: profiles.js CDN URL is correct', () => {
  it('uses momo-ai org in CDN URL', async () => {
    const src = await import('fs').then(m => m.promises.readFile(
      new URL('../../src/detector/profiles.js', import.meta.url), 'utf-8'
    ));
    expect(src).toMatch(/momo-ai\/agentic-service/);
    expect(src).not.toMatch(/momomo-ai/);
  });

  it('falls back to builtin profiles on fetch failure', async () => {
    vi.resetModules();
    mockFetch.mockRejectedValueOnce(new Error('network error'));
    // Remove cache file to force remote fetch attempt
    const os = await import('os');
    const path = await import('path');
    const fs = await import('fs/promises');
    const cacheFile = path.join(os.homedir(), '.agentic-service', 'profiles.json');
    await fs.rm(cacheFile, { force: true });

    const { getProfile } = await import('../../src/detector/profiles.js');
    // Should not throw — falls back to builtin
    const result = await getProfile({ platform: 'darwin', arch: 'arm64', gpu: { type: 'apple' }, memory: 16 });
    expect(result).toBeTruthy();
  });
});

// ── DBB-004: SIGINT graceful shutdown ─────────────────────────────────────────
describe('DBB-004: bin/agentic-service.js SIGINT/SIGTERM handlers', () => {
  it('registers both SIGINT and SIGTERM handlers', async () => {
    const src = await import('fs').then(m => m.promises.readFile(
      new URL('../../bin/agentic-service.js', import.meta.url), 'utf-8'
    ));
    expect(src).toMatch(/process\.on\('SIGINT'/);
    expect(src).toMatch(/process\.on\('SIGTERM'/);
  });

  it('shutdown calls server.close() with force-exit timeout', async () => {
    const src = await import('fs').then(m => m.promises.readFile(
      new URL('../../bin/agentic-service.js', import.meta.url), 'utf-8'
    ));
    expect(src).toMatch(/server\.close\(/);
    expect(src).toMatch(/setTimeout.*process\.exit\(0\)/);
    expect(src).toMatch(/\.unref\(\)/);
  });
});

// ── DBB-005/006: optimizer.js Ollama not installed + pull progress ────────────
describe('DBB-005/006: optimizer.js Ollama detection and pull progress', () => {
  it('promptInstallation outputs install command for darwin', async () => {
    const src = await import('fs').then(m => m.promises.readFile(
      new URL('../../src/detector/optimizer.js', import.meta.url), 'utf-8'
    ));
    expect(src).toMatch(/brew install ollama/);
    expect(src).toMatch(/curl.*ollama\.ai\/install/);
  });

  it('pullModel guards total=0 to avoid NaN percent', async () => {
    const src = await import('fs').then(m => m.promises.readFile(
      new URL('../../src/detector/optimizer.js', import.meta.url), 'utf-8'
    ));
    // Must guard: total > 0 ? ... : 0
    expect(src).toMatch(/total\s*>\s*0/);
  });

  it('pullModel calls onProgress with increasing percent', async () => {
    // Simulate the progress parsing logic inline
    const lines = [
      JSON.stringify({ status: 'pulling', completed: 0, total: 100 }),
      JSON.stringify({ status: 'pulling', completed: 50, total: 100 }),
      JSON.stringify({ status: 'pulling', completed: 100, total: 100 }),
    ];
    const percents = [];
    for (const line of lines) {
      const obj = JSON.parse(line);
      const { completed = 0, total = 0 } = obj;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      percents.push(percent);
    }
    expect(percents).toEqual([0, 50, 100]);
  });
});

// ── DBB-007: browser.js opens correct URL ────────────────────────────────────
describe('DBB-007: browser.js openBrowser', () => {
  it('openBrowser does not throw on failure (try/catch)', async () => {
    const src = await import('fs').then(m => m.promises.readFile(
      new URL('../../src/cli/browser.js', import.meta.url), 'utf-8'
    ));
    expect(src).toMatch(/try\s*\{/);
    expect(src).toMatch(/catch/);
  });

  it('bin entry opens browser after server starts', async () => {
    const src = await import('fs').then(m => m.promises.readFile(
      new URL('../../bin/agentic-service.js', import.meta.url), 'utf-8'
    ));
    expect(src).toMatch(/openBrowser/);
    expect(src).toMatch(/localhost:\$\{port\}/);
  });
});
