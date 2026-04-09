import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { describe, it, expect } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const profiles = JSON.parse(readFileSync(path.join(__dirname, '../profiles/default.json'), 'utf-8'));

describe('M27 profiles/default.json', () => {
  it('DBB-012: fallback profile exists (match: {})', () => {
    const fallback = profiles.profiles.find(e => Object.keys(e.match).length === 0);
    expect(fallback).not.toBeNull();
  })

  it('DBB-012: fallback has llm.model', () => {
    const fallback = profiles.profiles.find(e => Object.keys(e.match).length === 0);
    expect(fallback?.config?.llm?.model).toBeTruthy();
  })

  it('DBB-012: fallback model is lightweight', () => {
    const fallback = profiles.profiles.find(e => Object.keys(e.match).length === 0);
    const model = fallback?.config?.llm?.model || '';
    expect(model).toMatch(/1b|2b|3b|mini/);
  })

  it('profiles/default.json has version field', () => expect(profiles.version).toBeTruthy())
  it('profiles/default.json has profiles array', () => expect(Array.isArray(profiles.profiles)).toBe(true))
  it('profiles has at least 3 entries', () => expect(profiles.profiles.length).toBeGreaterThanOrEqual(3))
})
