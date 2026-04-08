import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('M20 DBB-007: profiles/default.json', () => {
  const data = JSON.parse(readFileSync('profiles/default.json', 'utf8'));
  const p = data.profiles.find(x => x.id === 'default');

  it('is valid JSON with profiles array', () => {
    expect(Array.isArray(data.profiles)).toBe(true);
  });

  it('has default profile entry', () => {
    expect(p).toBeDefined();
  });

  it('default profile has llm field', () => {
    expect(p.config.llm).toBeDefined();
  });

  it('default profile has stt field', () => {
    expect(p.config.stt).toBeDefined();
  });

  it('default profile has tts field', () => {
    expect(p.config.tts).toBeDefined();
  });

  it('default profile has fallback field', () => {
    expect('fallback' in p.config).toBe(true);
  });
});
