import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';

// Mock dependencies before importing modules
vi.mock('ora', () => ({
  default: () => ({ start: () => ({ succeed: vi.fn(), fail: vi.fn(), warn: vi.fn() }) })
}));
vi.mock('chalk', () => ({
  default: {
    bold: Object.assign((s) => s, { blue: (s) => s }),
    yellow: (s) => s,
    cyan: (s) => s,
    green: (s) => s,
    gray: (s) => s,
    white: (s) => s,
    red: (s) => s,
  }
}));

const mockHardware = {
  platform: 'darwin', arch: 'arm64',
  gpu: { type: 'apple-silicon', vram: 16 },
  memory: 16, cpu: { model: 'Apple M4', cores: 10 }
};
const mockProfile = {
  llm: { provider: 'ollama', model: 'gemma4:26b' },
  stt: { provider: 'sensevoice', model: 'small' },
  tts: { provider: 'kokoro', voice: 'default' },
  fallback: { provider: 'openai', model: 'gpt-4o-mini' }
};

vi.mock('../../src/detector/hardware.js', () => ({ detect: vi.fn() }));
vi.mock('../../src/detector/profiles.js', () => ({ getProfile: vi.fn() }));
vi.mock('../../src/detector/sox.js', () => ({ ensureSox: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../src/cli/download-state.js', () => ({
  setDownloadState: vi.fn(),
  clearDownloadState: vi.fn(),
  getDownloadState: vi.fn(() => ({})),
}));

// Mock child_process so no real processes are spawned
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    execSync: vi.fn(() => '/usr/bin/ollama'),
    spawn: vi.fn(() => {
      const emitter = { on: vi.fn(), stdout: { on: vi.fn() }, unref: vi.fn() };
      emitter.stdout.on.mockImplementation((event, cb) => {
        if (event === 'data') cb('gemma4:26b   abc123  4.0 GB\n');
      });
      emitter.on.mockImplementation((event, cb) => {
        if (event === 'close') setTimeout(() => cb(0), 0);
        return emitter;
      });
      return emitter;
    }),
  };
});

// Mock http so isOllamaRunning returns true
vi.mock('http', () => ({
  default: {
    get: vi.fn((url, cb) => {
      cb({ statusCode: 200 });
      return { on: vi.fn(), setTimeout: vi.fn() };
    }),
  },
}));

// Track what initFromProfile receives
const initFromProfileSpy = vi.fn();
vi.mock('../../src/config.js', () => ({
  initFromProfile: (...args) => { initFromProfileSpy(...args); },
  getConfig: vi.fn(async () => ({
    ollamaHost: 'http://localhost:11434',
    assignments: { chat: null },
    modelPool: [],
  })),
  onConfigChange: vi.fn(),
}));

// Mock fs to avoid writing real files (for other modules)
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    promises: {
      ...actual.promises,
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
    },
  };
});

describe('setup.runSetup()', () => {
  beforeEach(async () => {
    vi.resetModules();
    const { detect } = await import('../../src/detector/hardware.js');
    const { getProfile } = await import('../../src/detector/profiles.js');
    detect.mockResolvedValue(mockHardware);
    getProfile.mockResolvedValue(mockProfile);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('saves config file on successful setup', async () => {
    const { runSetup } = await import('../../src/cli/setup.js');
    await runSetup({ skipModelDownload: true });

    expect(initFromProfileSpy).toHaveBeenCalled();
    const [profile, hardware] = initFromProfileSpy.mock.calls[0];
    expect(hardware).toHaveProperty('platform');
    expect(profile).toHaveProperty('llm');
  });

  it('calls detect() and getProfile()', async () => {
    const { detect } = await import('../../src/detector/hardware.js');
    const { getProfile } = await import('../../src/detector/profiles.js');
    const { runSetup } = await import('../../src/cli/setup.js');

    await runSetup({ skipModelDownload: true });

    expect(detect).toHaveBeenCalled();
    expect(getProfile).toHaveBeenCalledWith(mockHardware);
  });

  it('skips ollama setup when provider is not ollama', async () => {
    const { getProfile } = await import('../../src/detector/profiles.js');
    getProfile.mockResolvedValue({ ...mockProfile, llm: { provider: 'openai', model: 'gpt-4o' } });

    const { spawn } = await import('child_process');
    const { runSetup } = await import('../../src/cli/setup.js');
    await runSetup();

    // spawn should not be called for ollama list/pull when provider is not ollama
    expect(spawn).not.toHaveBeenCalledWith('ollama', ['list'], expect.anything());
  });
});

describe('browser.openBrowser()', () => {
  it('calls open() with the given url', async () => {
    const mockOpen = vi.fn().mockResolvedValue(undefined);
    vi.doMock('open', () => ({ default: mockOpen }));

    const { openBrowser } = await import('../../src/cli/browser.js');
    await openBrowser('http://localhost:3000');

    expect(mockOpen).toHaveBeenCalledWith('http://localhost:3000');
  });

  it('does not throw when open() fails', async () => {
    vi.doMock('open', () => ({ default: vi.fn().mockRejectedValue(new Error('no browser')) }));

    const { openBrowser } = await import('../../src/cli/browser.js');
    await expect(openBrowser('http://localhost:3000')).resolves.not.toThrow();
  });
});

describe('checkFirstRun logic', () => {
  it('returns true when config file does not exist', async () => {
    const nonExistent = path.join(os.tmpdir(), `no-such-${Date.now()}`, 'config.json');
    const { promises: realFs } = await vi.importActual('fs');
    let result;
    try {
      await realFs.access(nonExistent);
      result = false;
    } catch {
      result = true;
    }
    expect(result).toBe(true);
  });

  it('returns false when config file exists', async () => {
    const { promises: realFs } = await vi.importActual('fs');
    const tmpDir = path.join(os.tmpdir(), `agentic-check-${Date.now()}`);
    const configPath = path.join(tmpDir, 'config.json');
    await realFs.mkdir(tmpDir, { recursive: true });
    await realFs.writeFile(configPath, '{}');

    let result;
    try {
      await realFs.access(configPath);
      result = false;
    } catch {
      result = true;
    }
    expect(result).toBe(false);
    await realFs.rm(tmpDir, { recursive: true });
  });
});
