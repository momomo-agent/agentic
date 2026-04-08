import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'src/runtime/llm.js'), 'utf8');

describe('DBB-008/009: llm.js hardware-adaptive model selection', () => {
  it('no hardcoded gemma4:26b model string', () => {
    expect(src).not.toMatch(/['"]gemma4:26b['"]/);
  });

  it('uses config.llm.model from loadConfig (profile-driven)', () => {
    expect(src).toContain('config.llm.model');
  });

  it('loadConfig calls detectHardware and getProfile', () => {
    expect(src).toContain('detectHardware');
    expect(src).toContain('getProfile');
  });
});
