import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const profiles = JSON.parse(
  readFileSync(resolve(process.cwd(), 'profiles/default.json'), 'utf8')
).profiles;

const cpuProfile = profiles.find(p => p.match?.gpu === 'none');

describe('cpu-only profile in profiles/default.json', () => {
  it('entry with match.gpu === "none" exists', () => {
    expect(cpuProfile).toBeDefined();
  });

  it('llm.model is gemma2:2b', () => {
    expect(cpuProfile.config.llm.model).toBe('gemma2:2b');
  });

  it('llm.quantization is q4', () => {
    expect(cpuProfile.config.llm.quantization).toBe('q4');
  });

  it('includes stt, tts, and fallback fields', () => {
    expect(cpuProfile.config.stt).toBeDefined();
    expect(cpuProfile.config.tts).toBeDefined();
    expect(cpuProfile.config.fallback).toBeDefined();
  });
});
