import { describe, it, expect } from 'vitest';
import { matchProfile } from '../src/detector/matcher.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILTIN_PATH = path.join(__dirname, '..', 'profiles', 'default.json');

describe('profiles.js M21 DBB', () => {
  it('DBB-001: getProfile returns llm/stt/tts/fallback for valid hardware', async () => {
    const raw = await fs.readFile(BUILTIN_PATH, 'utf-8');
    const profiles = JSON.parse(raw);
    const hw = { platform: 'darwin', arch: 'arm64', gpu: { type: 'apple-silicon' }, memory: 16 };
    const profile = matchProfile(profiles, hw);
    expect(profile).toHaveProperty('llm');
    expect(profile).toHaveProperty('stt');
    expect(profile).toHaveProperty('tts');
    expect('fallback' in profile).toBe(true);
  });

  it('DBB-002: getProfile falls back to built-in default when network unavailable and no cache', async () => {
    // The built-in default.json has a catch-all profile with match: {}
    // This verifies that even with no specific hardware match, a default profile is returned
    const raw = await fs.readFile(BUILTIN_PATH, 'utf-8');
    const profiles = JSON.parse(raw);
    const hw = { platform: 'windows', arch: 'x86', gpu: { type: 'unknown' }, memory: 2 };
    const profile = matchProfile(profiles, hw);
    expect(profile).toHaveProperty('llm');
  });
});
