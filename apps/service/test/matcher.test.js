import { describe, it, expect } from 'vitest';
import assert from 'node:assert/strict';
import { matchProfile } from '../src/detector/matcher.js';

const profiles = {
  version: '1.0.0',
  profiles: [
    {
      match: { platform: 'darwin', arch: 'arm64', gpu: 'apple-silicon', minMemory: 16 },
      config: { llm: { model: 'gemma4:26b' } }
    },
    {
      match: { platform: 'linux', gpu: 'nvidia', minMemory: 8 },
      config: { llm: { model: 'gemma4:13b' } }
    },
    {
      match: { gpu: 'none' },
      config: { llm: { model: 'gemma2:2b-none' } }
    },
    {
      match: {},
      config: { llm: { model: 'gemma3:1b' } }
    }
  ]
};

describe('matchProfile()', () => {
  it('matches apple-silicon', () => {
    const hw = { platform: 'darwin', arch: 'arm64', gpu: { type: 'apple-silicon' }, memory: 32 };
    const result = matchProfile(profiles, hw);
    assert.equal(result.llm.model, 'gemma4:26b');
  });

  it('matches nvidia', () => {
    const hw = { platform: 'linux', arch: 'x64', gpu: { type: 'nvidia' }, memory: 16 };
    const result = matchProfile(profiles, hw);
    assert.equal(result.llm.model, 'gemma4:13b');
  });

  it('matches cpu-only fallback (gpu.type = none)', () => {
    const hw = { platform: 'linux', arch: 'x64', gpu: { type: 'none' }, memory: 8 };
    const result = matchProfile(profiles, hw);
    assert.equal(result.llm.model, 'gemma2:2b-none');
  });

  it('falls back to default when gpu is undefined', () => {
    const hw = { platform: 'darwin', arch: 'x64', gpu: undefined, memory: 8 };
    const result = matchProfile(profiles, hw);
    assert.ok(result.llm.model, 'should return a valid profile');
  });

  it('falls back to default for unknown GPU type', () => {
    const hw = { platform: 'linux', arch: 'x64', gpu: { type: 'unknown-gpu' }, memory: 8 };
    const result = matchProfile(profiles, hw);
    assert.equal(result.llm.model, 'gemma3:1b');
  });

  it('throws when no profile matches', () => {
    const narrowProfiles = {
      version: '1',
      profiles: [{ match: { platform: 'win32' }, config: { llm: { model: 'x' } } }]
    };
    const hw = { platform: 'darwin', arch: 'x64', gpu: { type: 'none' }, memory: 8 };
    assert.throws(() => matchProfile(narrowProfiles, hw), /No matching profile found/);
  });
});
