import { describe, it, expect } from 'vitest';
import { matchProfile } from '../src/detector/matcher.js';

const hardware = { platform: 'linux', arch: 'x64', gpu: { type: 'none' }, memory: 8 };

describe('profiles edge cases', () => {
  it('empty profiles array throws', () => {
    expect(() => matchProfile({ profiles: [] }, hardware)).toThrow();
  });
});
