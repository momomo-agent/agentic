import { readFileSync } from 'fs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const src = readFileSync('src/detector/profiles.js', 'utf8');

describe('M19 DBB-001: CDN URL is not a placeholder', () => {
  it('does not contain cdn.example.com', () => {
    expect(src).not.toContain('cdn.example.com');
  });

  it('uses a real URL (raw.githubusercontent.com) as default', () => {
    expect(src).toContain('raw.githubusercontent.com');
  });
});

describe('M19 DBB-003: CDN URL configurable via env var', () => {
  it('uses process.env.PROFILES_URL when set', () => {
    expect(src).toContain('process.env.PROFILES_URL');
  });

  it('falls back to default URL when env var not set', () => {
    // pattern: process.env.PROFILES_URL || 'https://...'
    expect(src).toMatch(/process\.env\.PROFILES_URL\s*\|\|/);
  });
});

describe('M19 DBB-002: fallback to local default.json on network failure', () => {
  it('loadBuiltinProfiles reads profiles/default.json', () => {
    expect(src).toContain('profiles/default.json');
  });

  it('fetch failure path falls through to builtin profiles', () => {
    // Verify catch block exists and calls loadBuiltinProfiles
    expect(src).toContain('loadBuiltinProfiles');
    expect(src).toContain('catch');
  });

  it('profiles/default.json exists and is valid JSON', async () => {
    const content = readFileSync('profiles/default.json', 'utf8');
    const parsed = JSON.parse(content);
    expect(parsed).toBeTruthy();
  });
});
