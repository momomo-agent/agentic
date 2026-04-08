import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';

const CACHE_FILE = path.join(os.homedir(), '.agentic-service', 'profiles.json');

describe('profiles.js M21 DBB', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('DBB-001: getProfile returns llm/stt/tts/fallback for valid hardware', async () => {
    // Use built-in default (no network needed) by mocking fetch to fail and cache to miss
    vi.doMock('fs/promises', async () => {
      const actual = await vi.importActual('fs/promises');
      return {
        ...actual,
        readFile: vi.fn(async (filePath, ...args) => {
          if (String(filePath).includes('.agentic-service')) throw new Error('ENOENT');
          return actual.readFile(filePath, ...args);
        }),
        mkdir: actual.mkdir,
        writeFile: vi.fn(),
      };
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    const { getProfile } = await import('../src/detector/profiles.js');
    const hw = { platform: 'darwin', arch: 'arm64', gpu: { type: 'apple-silicon' }, memory: 16 };
    const profile = await getProfile(hw);
    expect(profile).toHaveProperty('llm');
    expect(profile).toHaveProperty('stt');
    expect(profile).toHaveProperty('tts');
    expect('fallback' in profile).toBe(true);
  });

  it('DBB-002: getProfile falls back to built-in default when network unavailable and no cache', async () => {
    // Mock fs to simulate no cache
    vi.doMock('fs/promises', async () => {
      const actual = await vi.importActual('fs/promises');
      return {
        ...actual,
        readFile: vi.fn(async (filePath, ...args) => {
          if (filePath === CACHE_FILE) throw new Error('ENOENT');
          return actual.readFile(filePath, ...args);
        }),
        mkdir: actual.mkdir,
        writeFile: vi.fn(),
      };
    });

    // Mock fetch to throw
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network unavailable')));

    const { getProfile } = await import('../src/detector/profiles.js');
    const hw = { platform: 'darwin', arch: 'arm64', gpu: { type: 'apple-silicon' }, memory: 16 };
    const profile = await getProfile(hw);
    expect(profile).toHaveProperty('llm');
  });
});
