// M29 DBB: Ollama自动安装 + 模型拉取 (src/detector/ollama.js)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';

const src = readFileSync('src/detector/ollama.js', 'utf8');

describe('M29 DBB: src/detector/ollama.js structure', () => {
  it('exports ensureOllama', () => {
    expect(src).toContain('export async function ensureOllama');
  });

  it('checks which ollama to detect binary', () => {
    expect(src).toContain('which ollama');
  });

  it('supports darwin/linux install via curl', () => {
    expect(src).toContain('ollama.ai/install.sh');
  });

  it('supports win32 install via winget', () => {
    expect(src).toContain('winget install Ollama.Ollama');
  });

  it('throws on install failure with stderr', () => {
    expect(src).toContain('Ollama install failed');
  });

  it('calls ollama pull with model', () => {
    expect(src).toContain("'pull'");
    expect(src).toContain('model');
  });

  it('throws on pull failure', () => {
    expect(src).toContain('Model pull failed');
  });

  it('pipes stdout to onProgress', () => {
    expect(src).toContain('onProgress');
  });
});

describe('M29 DBB: ensureOllama behavior (mocked)', () => {
  beforeEach(() => vi.resetModules());

  it('skips install when ollama already installed', async () => {
    vi.doMock('node:child_process', () => ({
      exec: vi.fn((cmd, cb) => {
        if (cmd.includes('which')) cb(null, { stdout: '/usr/bin/ollama', stderr: '' });
      }),
      spawn: vi.fn(() => {
        const ee = { stdout: { on: vi.fn() }, on: vi.fn() };
        ee.on.mockImplementation((ev, cb) => { if (ev === 'close') cb(0); });
        return ee;
      }),
    }));
    vi.doMock('node:util', () => ({
      promisify: (fn) => (...args) => new Promise((res, rej) => fn(...args, (err, val) => err ? rej(err) : res(val))),
    }));
    const { ensureOllama } = await import('../src/detector/ollama.js');
    await expect(ensureOllama('gemma4:26b', vi.fn())).resolves.toBeUndefined();
  });

  it('throws when pull exits non-zero', async () => {
    vi.doMock('node:child_process', () => ({
      exec: vi.fn((cmd, cb) => {
        if (cmd.includes('which')) cb(null, { stdout: '/usr/bin/ollama', stderr: '' });
      }),
      spawn: vi.fn(() => {
        const ee = { stdout: { on: vi.fn() }, on: vi.fn() };
        ee.on.mockImplementation((ev, cb) => { if (ev === 'close') cb(1); });
        return ee;
      }),
    }));
    vi.doMock('node:util', () => ({
      promisify: (fn) => (...args) => new Promise((res, rej) => fn(...args, (err, val) => err ? rej(err) : res(val))),
    }));
    const { ensureOllama } = await import('../src/detector/ollama.js');
    await expect(ensureOllama('gemma4:26b', vi.fn())).rejects.toThrow('Model pull failed');
  });
});
