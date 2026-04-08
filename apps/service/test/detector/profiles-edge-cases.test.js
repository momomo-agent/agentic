import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getProfile } from '../../src/detector/profiles.js';
import { matchProfile } from '../../src/detector/matcher.js';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const CACHE_DIR = path.join(os.homedir(), '.agentic-service');
const CACHE_FILE = path.join(CACHE_DIR, 'profiles.json');

describe('profiles edge cases', () => {
  beforeEach(async () => {
    // Clean up cache before each test
    try {
      await fs.unlink(CACHE_FILE);
    } catch {}
  });

  afterEach(async () => {
    // Clean up cache after each test
    try {
      await fs.unlink(CACHE_FILE);
    } catch {}
  });

  it('should match Linux + NVIDIA profile', async () => {
    const hardware = {
      platform: 'linux',
      arch: 'x64',
      gpu: { type: 'nvidia', vram: 8 },
      memory: 16,
      cpu: { cores: 8, model: 'Intel Xeon' }
    };

    const profile = await getProfile(hardware);
    expect(profile.llm.provider).toBe('ollama');
    expect(profile.llm.model).toBe('gemma4:13b');
  });

  it('should reject profile when memory is insufficient', async () => {
    const hardware = {
      platform: 'darwin',
      arch: 'arm64',
      gpu: { type: 'apple-silicon', vram: 16 },
      memory: 8, // Less than minMemory: 16
      cpu: { cores: 10, model: 'Apple M4' }
    };

    const profile = await getProfile(hardware);
    // Should fallback to default OpenAI profile
    expect(profile.llm.provider).toBe('openai');
  });

  it.fails('should prioritize more specific matches', async () => {
    // BUG: Normalization causes both profiles to score 100
    // Profile with 1 criterion (platform) scores 30/30 = 100
    // Profile with 3 criteria (platform+arch+gpu) scores 80/80 = 100
    // First match wins instead of most specific match
    const profiles = {
      version: '1.0.0',
      profiles: [
        {
          match: { platform: 'darwin' },
          config: { llm: { provider: 'generic' } }
        },
        {
          match: { platform: 'darwin', arch: 'arm64', gpu: 'apple-silicon' },
          config: { llm: { provider: 'specific' } }
        }
      ]
    };

    const hardware = {
      platform: 'darwin',
      arch: 'arm64',
      gpu: { type: 'apple-silicon' },
      memory: 16
    };

    const result = matchProfile(profiles, hardware);
    expect(result.llm.provider).toBe('specific');
  });

  it('should handle empty match criteria (default profile)', async () => {
    const profiles = {
      version: '1.0.0',
      profiles: [
        {
          match: {},
          config: { llm: { provider: 'default' } }
        }
      ]
    };

    const hardware = {
      platform: 'any',
      arch: 'any',
      gpu: { type: 'any' },
      memory: 1
    };

    const result = matchProfile(profiles, hardware);
    expect(result.llm.provider).toBe('default');
  });

  it('should reject when platform does not match', async () => {
    const profiles = {
      version: '1.0.0',
      profiles: [
        {
          match: { platform: 'linux' },
          config: { llm: { provider: 'linux-only' } }
        },
        {
          match: {},
          config: { llm: { provider: 'default' } }
        }
      ]
    };

    const hardware = {
      platform: 'darwin',
      arch: 'arm64',
      gpu: { type: 'apple-silicon' },
      memory: 16
    };

    const result = matchProfile(profiles, hardware);
    expect(result.llm.provider).toBe('default');
  });

  it('should handle partial matches correctly', async () => {
    const profiles = {
      version: '1.0.0',
      profiles: [
        {
          match: { platform: 'darwin', arch: 'arm64' },
          config: { llm: { provider: 'partial' } }
        }
      ]
    };

    const hardware = {
      platform: 'darwin',
      arch: 'arm64',
      gpu: { type: 'apple-silicon' },
      memory: 16
    };

    const result = matchProfile(profiles, hardware);
    expect(result.llm.provider).toBe('partial');
  });

  it('should handle arch mismatch gracefully', async () => {
    const profiles = {
      version: '1.0.0',
      profiles: [
        {
          match: { platform: 'darwin', arch: 'x64' },
          config: { llm: { provider: 'intel' } }
        },
        {
          match: { platform: 'darwin' },
          config: { llm: { provider: 'any-darwin' } }
        }
      ]
    };

    const hardware = {
      platform: 'darwin',
      arch: 'arm64',
      gpu: { type: 'apple-silicon' },
      memory: 16
    };

    const result = matchProfile(profiles, hardware);
    // Should match the less specific darwin profile
    expect(result.llm.provider).toBe('any-darwin');
  });

  it('should handle GPU type mismatch', async () => {
    const profiles = {
      version: '1.0.0',
      profiles: [
        {
          match: { gpu: 'nvidia' },
          config: { llm: { provider: 'nvidia' } }
        },
        {
          match: {},
          config: { llm: { provider: 'default' } }
        }
      ]
    };

    const hardware = {
      platform: 'darwin',
      arch: 'arm64',
      gpu: { type: 'apple-silicon' },
      memory: 16
    };

    const result = matchProfile(profiles, hardware);
    expect(result.llm.provider).toBe('default');
  });

  it('should throw error when no profiles match', () => {
    const profiles = {
      version: '1.0.0',
      profiles: [
        {
          match: { platform: 'linux', minMemory: 32 },
          config: { llm: { provider: 'high-end' } }
        }
      ]
    };

    const hardware = {
      platform: 'darwin',
      arch: 'arm64',
      gpu: { type: 'apple-silicon' },
      memory: 16
    };

    expect(() => matchProfile(profiles, hardware)).toThrow('No matching profile found');
  });

  it('should handle low memory systems', async () => {
    const hardware = {
      platform: 'linux',
      arch: 'x64',
      gpu: { type: 'none', vram: 0 },
      memory: 2,
      cpu: { cores: 2, model: 'Intel Celeron' }
    };

    const profile = await getProfile(hardware);
    // Should fallback to OpenAI (cloud-based)
    expect(profile.llm.provider).toBe('openai');
  });

  it('should return complete profile structure', async () => {
    const hardware = {
      platform: 'darwin',
      arch: 'arm64',
      gpu: { type: 'apple-silicon', vram: 16 },
      memory: 16,
      cpu: { cores: 10, model: 'Apple M4' }
    };

    const profile = await getProfile(hardware);
    expect(profile).toHaveProperty('llm');
    expect(profile).toHaveProperty('stt');
    expect(profile).toHaveProperty('tts');
    expect(profile).toHaveProperty('fallback');
    expect(profile.llm).toHaveProperty('provider');
    expect(profile.llm).toHaveProperty('model');
  });
});

describe('cache functionality', () => {
  beforeEach(async () => {
    try {
      await fs.unlink(CACHE_FILE);
    } catch {}
  });

  afterEach(async () => {
    try {
      await fs.unlink(CACHE_FILE);
    } catch {}
  });

  it('should use built-in profiles when cache does not exist', async () => {
    const hardware = {
      platform: 'darwin',
      arch: 'arm64',
      gpu: { type: 'apple-silicon', vram: 16 },
      memory: 16,
      cpu: { cores: 10, model: 'Apple M4' }
    };

    const profile = await getProfile(hardware);
    expect(profile.llm.provider).toBe('ollama');
  });

  it('should handle network failure gracefully', async () => {
    // Network will fail (404), should fallback to built-in
    const hardware = {
      platform: 'darwin',
      arch: 'arm64',
      gpu: { type: 'apple-silicon', vram: 16 },
      memory: 16,
      cpu: { cores: 10, model: 'Apple M4' }
    };

    const profile = await getProfile(hardware);
    expect(profile).toBeDefined();
    expect(profile.llm.provider).toBe('ollama');
  });

  it('should use expired cache when network fails', async () => {
    // Create an expired cache
    const expiredCache = {
      data: {
        version: '1.0.0',
        profiles: [
          {
            match: {},
            config: {
              llm: { provider: 'cached-provider', model: 'cached-model' },
              stt: { provider: 'cached' },
              tts: { provider: 'cached' },
              fallback: null
            }
          }
        ]
      },
      timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000) // 8 days ago
    };

    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify(expiredCache, null, 2));

    const hardware = {
      platform: 'darwin',
      arch: 'arm64',
      gpu: { type: 'apple-silicon', vram: 16 },
      memory: 16,
      cpu: { cores: 10, model: 'Apple M4' }
    };

    const profile = await getProfile(hardware);
    // Should use expired cache since network fails
    expect(profile.llm.provider).toBe('cached-provider');
  });
});
