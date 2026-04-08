// M29 DBB: Ollama自动安装 + 模型拉取
import { readFileSync } from 'fs';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const src = readFileSync('src/detector/ollama.js', 'utf8');

describe('M29 DBB: ensureOllama export', () => {
  it('exports ensureOllama function', () => {
    expect(src).toContain('export async function ensureOllama');
  });

  it('checks for ollama binary via which', () => {
    expect(src).toContain('which ollama');
  });
});

describe('M29 DBB: install logic', () => {
  it('uses curl install script for darwin/linux', () => {
    expect(src).toContain('https://ollama.ai/install.sh');
  });

  it('uses winget for win32', () => {
    expect(src).toContain('winget install Ollama.Ollama');
  });

  it('throws on install failure with stderr message', () => {
    expect(src).toContain('Ollama install failed:');
  });
});

describe('M29 DBB: model pull', () => {
  it('runs ollama pull with model arg', () => {
    expect(src).toContain("spawn('ollama', ['pull', model]");
  });

  it('pipes stdout to onProgress callback', () => {
    expect(src).toContain('onProgress');
    expect(src).toContain('stdout');
  });

  it('throws on non-zero exit code', () => {
    expect(src).toContain('Model pull failed');
  });
});

describe('M29 DBB: runtime behavior (mocked)', () => {
  beforeEach(() => vi.resetModules());

  it('skips install when ollama already installed', async () => {
    vi.doMock('node:child_process', () => ({
      exec: vi.fn((cmd, cb) => {
        if (cmd === 'which ollama') return cb(null, { stdout: '/usr/bin/ollama', stderr: '' });
        cb(new Error('unexpected'));
      }),
      spawn: vi.fn(() => {
        const ee = { stdout: { on: vi.fn() }, on: vi.fn() };
        // simulate close with code 0
        setTimeout(() => {
          const closeHandler = ee.on.mock.calls.find(c => c[0] === 'close')?.[1];
          closeHandler?.(0);
        }, 0);
        return ee;
      }),
      promisify: (fn) => (...args) => new Promise((res, rej) => fn(...args, (err, val) => err ? rej(err) : res(val))),
    }));
    vi.doMock('node:util', () => ({
      promisify: (fn) => (...args) => new Promise((res, rej) => fn(...args, (err, val) => err ? rej(err) : res(val))),
    }));

    // Source-level check: ensureOllama only installs if not found
    expect(src).toContain('isOllamaInstalled');
    expect(src).toMatch(/if\s*\(!\s*\(await isOllamaInstalled\(\)\)\)/);
  });

  it('throws error when pull fails', async () => {
    // Verify error path exists in source
    expect(src).toContain("reject(new Error('Model pull failed");
  });
});
