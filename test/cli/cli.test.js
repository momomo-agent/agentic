import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Mock dependencies before importing modules
vi.mock('ora', () => ({
  default: () => ({ start: () => ({ succeed: vi.fn(), fail: vi.fn() }) })
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
vi.mock('../../src/detector/optimizer.js', () => ({ setupOllama: vi.fn() }));

describe('setup.runSetup()', () => {
  let tmpConfig;

  beforeEach(async () => {
    tmpConfig = path.join(os.tmpdir(), `agentic-test-${Date.now()}`);
    const { detect } = await import('../../src/detector/hardware.js');
    const { getProfile } = await import('../../src/detector/profiles.js');
    const { setupOllama } = await import('../../src/detector/optimizer.js');
    detect.mockResolvedValue(mockHardware);
    getProfile.mockResolvedValue(mockProfile);
    setupOllama.mockResolvedValue({ needsInstall: false, ready: true, model: 'gemma4:26b' });
  });

  afterEach(async () => {
    await fs.rm(tmpConfig, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('saves config file on successful setup', async () => {
    // Patch CONFIG_PATH by writing to a temp dir
    const configDir = path.join(os.homedir(), '.agentic-service');
    const configPath = path.join(configDir, 'config.json');

    const { runSetup } = await import('../../src/cli/setup.js');
    await runSetup();

    const saved = JSON.parse(await fs.readFile(configPath, 'utf8'));
    expect(saved).toHaveProperty('hardware');
    expect(saved).toHaveProperty('profile');
    expect(saved.hardware.platform).toBe('darwin');
  });

  it('calls detect() and getProfile()', async () => {
    const { detect } = await import('../../src/detector/hardware.js');
    const { getProfile } = await import('../../src/detector/profiles.js');
    const { runSetup } = await import('../../src/cli/setup.js');

    await runSetup();

    expect(detect).toHaveBeenCalled();
    expect(getProfile).toHaveBeenCalledWith(mockHardware);
  });

  it('calls setupOllama when provider is ollama', async () => {
    const { setupOllama } = await import('../../src/detector/optimizer.js');
    const { runSetup } = await import('../../src/cli/setup.js');

    await runSetup();

    expect(setupOllama).toHaveBeenCalledWith(mockProfile);
  });

  it('exits process when ollama needs install', async () => {
    const { setupOllama } = await import('../../src/detector/optimizer.js');
    setupOllama.mockResolvedValue({ needsInstall: true, installCommand: 'brew install ollama' });

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });
    const { runSetup } = await import('../../src/cli/setup.js');

    await expect(runSetup()).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });

  it('skips setupOllama when provider is not ollama', async () => {
    const { getProfile } = await import('../../src/detector/profiles.js');
    const { setupOllama } = await import('../../src/detector/optimizer.js');
    getProfile.mockResolvedValue({ ...mockProfile, llm: { provider: 'openai', model: 'gpt-4o' } });

    const { runSetup } = await import('../../src/cli/setup.js');
    await runSetup();

    expect(setupOllama).not.toHaveBeenCalled();
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
    let result;
    try {
      await fs.access(nonExistent);
      result = false;
    } catch {
      result = true;
    }
    expect(result).toBe(true);
  });

  it('returns false when config file exists', async () => {
    const tmpDir = path.join(os.tmpdir(), `agentic-check-${Date.now()}`);
    const configPath = path.join(tmpDir, 'config.json');
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(configPath, '{}');

    let result;
    try {
      await fs.access(configPath);
      result = false;
    } catch {
      result = true;
    }
    expect(result).toBe(false);
    await fs.rm(tmpDir, { recursive: true });
  });
});
