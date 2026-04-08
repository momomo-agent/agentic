import { readFileSync } from 'fs';
import { describe, it, expect } from 'vitest';

describe('CDN URL', () => {
  it('profiles.js uses cdn.example.com not jsdelivr.net', () => {
    const src = readFileSync('src/detector/profiles.js', 'utf8');
    expect(src).toContain('cdn.example.com');
    expect(src).not.toContain('jsdelivr.net');
  });
});
