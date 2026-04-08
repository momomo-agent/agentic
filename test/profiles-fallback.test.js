import { readFileSync } from 'fs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('profiles fallback to default.json', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('loadBuiltinProfiles is called when fetch fails and cache is absent', async () => {
    // Point cache to a temp dir that doesn't exist so cache read fails
    vi.stubEnv('HOME', '/tmp/nonexistent-test-home-xyz');
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'));

    const { getProfile } = await import('../src/detector/profiles.js');
    const result = await getProfile({ platform: 'linux', arch: 'x64', gpu: { type: 'none' }, memory: 4 });

    expect(result).toHaveProperty('llm');
    expect(result).toHaveProperty('stt');
    expect(result).toHaveProperty('tts');
  });

  it('default.json has a cpu-only catch-all profile with llm/stt/tts', () => {
    const data = JSON.parse(readFileSync('profiles/default.json', 'utf8'));
    const catchAll = data.profiles.find(p =>
      Object.keys(p.match).length === 0 || p.match.gpu === 'none' || p.match.gpu === 'cpu-only'
    );
    expect(catchAll).toBeTruthy();
    expect(catchAll.config).toHaveProperty('llm');
    expect(catchAll.config).toHaveProperty('stt');
    expect(catchAll.config).toHaveProperty('tts');
  });
});
