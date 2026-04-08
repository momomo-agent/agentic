import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getProfile } from '../../src/detector/profiles.js';
import { matchProfile } from '../../src/detector/matcher.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('profiles.getProfile()', () => {
  it('should match Apple Silicon profile', async () => {
    const hardware = {
      platform: 'darwin',
      arch: 'arm64',
      gpu: { type: 'apple-silicon', vram: 16 },
      memory: 16,
      cpu: { cores: 10, model: 'Apple M4' }
    };

    const profile = await getProfile(hardware);
    expect(profile.llm.provider).toBe('ollama');
    expect(profile.llm.model).toBe('gemma4:26b');
  });

  it('should fallback to default when no match', async () => {
    const hardware = {
      platform: 'win32',
      arch: 'x64',
      gpu: { type: 'none', vram: 0 },
      memory: 4,
      cpu: { cores: 4, model: 'Intel' }
    };

    const profile = await getProfile(hardware);
    expect(profile.llm.provider).toBe('openai');
  });
});

describe('matcher.matchProfile()', () => {
  it('should calculate correct match score', () => {
    const profiles = {
      version: '1.0.0',
      profiles: [
        {
          match: { platform: 'darwin', arch: 'arm64', gpu: 'apple-silicon' },
          config: { llm: { provider: 'ollama' } }
        }
      ]
    };

    const hardware = {
      platform: 'darwin',
      arch: 'arm64',
      gpu: { type: 'apple-silicon' }
    };

    const result = matchProfile(profiles, hardware);
    expect(result.llm.provider).toBe('ollama');
  });
});

describe('profiles cache staleness (7-day refresh)', () => {
  const CACHE_FILE = path.join(os.homedir(), '.agentic-service', 'profiles.json');
  const mockProfilesData = {
    version: '1.0.0',
    profiles: [
      {
        match: { platform: 'darwin', arch: 'arm64' },
        config: { llm: { provider: 'ollama', model: 'test-model' } }
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('re-fetches when cache is older than 7 days', async () => {
    const oldTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const expiredCache = {
      data: mockProfilesData,
      timestamp: oldTimestamp
    };

    // Mock fs.readFile to return expired cache
    vi.spyOn(fs, 'readFile').mockResolvedValueOnce(JSON.stringify(expiredCache));

    // Mock fetch to return fresh data
    const freshData = { ...mockProfilesData, version: '2.0.0' };
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => freshData
    });

    // Mock fs.writeFile to capture saveCache call
    const writeFileSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue();
    vi.spyOn(fs, 'mkdir').mockResolvedValue();

    const hardware = {
      platform: 'darwin',
      arch: 'arm64',
      gpu: { type: 'apple-silicon' },
      memory: 16
    };

    await getProfile(hardware);

    // Verify fetch was called
    expect(global.fetch).toHaveBeenCalled();

    // Verify saveCache was called with fresh data
    expect(writeFileSpy).toHaveBeenCalled();
    const savedData = JSON.parse(writeFileSpy.mock.calls[0][1]);
    expect(savedData.data.version).toBe('2.0.0');
  });

  it('uses cache without fetch when cache is fresh', async () => {
    const freshTimestamp = Date.now() - 1 * 24 * 60 * 60 * 1000;
    const freshCache = {
      data: mockProfilesData,
      timestamp: freshTimestamp
    };

    // Mock fs.readFile to return fresh cache
    vi.spyOn(fs, 'readFile').mockResolvedValueOnce(JSON.stringify(freshCache));

    // Mock fetch - should NOT be called
    global.fetch = vi.fn();

    const hardware = {
      platform: 'darwin',
      arch: 'arm64',
      gpu: { type: 'apple-silicon' },
      memory: 16
    };

    const profile = await getProfile(hardware);

    // Verify fetch was NOT called
    expect(global.fetch).not.toHaveBeenCalled();

    // Verify we got the cached profile
    expect(profile.llm.provider).toBe('ollama');
  });

  it('falls back to expired cache if re-fetch fails', async () => {
    const oldTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const expiredCache = {
      data: mockProfilesData,
      timestamp: oldTimestamp
    };

    // Mock fs.readFile to return expired cache
    vi.spyOn(fs, 'readFile').mockResolvedValueOnce(JSON.stringify(expiredCache));

    // Mock fetch to fail
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    const hardware = {
      platform: 'darwin',
      arch: 'arm64',
      gpu: { type: 'apple-silicon' },
      memory: 16
    };

    // Should not crash, should return profile from expired cache
    const profile = await getProfile(hardware);

    expect(profile.llm.provider).toBe('ollama');
    expect(profile.llm.model).toBe('test-model');
  });
});
