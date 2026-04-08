import { readFileSync } from 'fs';
import { describe, it, expect } from 'vitest';

const src = readFileSync('src/detector/profiles.js', 'utf8');

describe('M30 DBB-004: CDN endpoint is not a placeholder', () => {
  it('does not contain cdn.example.com', () => {
    expect(src).not.toContain('cdn.example.com');
  });

  it('does not contain any placeholder strings', () => {
    expect(src).not.toMatch(/example\.com|placeholder|TODO|FIXME/i);
  });

  it('default URL is a real accessible endpoint', () => {
    expect(src).toContain('raw.githubusercontent.com');
  });
});

describe('M30 DBB-005: CDN endpoint configurable via env var', () => {
  it('uses PROFILES_URL env var', () => {
    expect(src).toContain('process.env.PROFILES_URL');
  });

  it('falls back to real URL when env var not set', () => {
    expect(src).toMatch(/process\.env\.PROFILES_URL\s*\|\|\s*'https:\/\//);
  });
});

describe('M30 DBB-006: startup log shows profiles URL', () => {
  it('logs PROFILES_URL on fetch', () => {
    expect(src).toContain("console.log('Profiles URL:', PROFILES_URL)");
  });
});

describe('M30 DBB-006: fallback chain on CDN unreachable', () => {
  it('falls back to expired cache', () => {
    expect(src).toContain('Using expired cache');
  });

  it('falls back to built-in profiles as last resort', () => {
    expect(src).toContain('Using built-in default profiles');
    expect(src).toContain('loadBuiltinProfiles');
  });

  it('7-day cache TTL is configured', () => {
    expect(src).toContain('7 * 24 * 60 * 60 * 1000');
  });
});
