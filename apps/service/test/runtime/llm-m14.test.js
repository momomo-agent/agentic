import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// LLM logic moved from src/runtime/llm.js to src/server/brain.js
const src = readFileSync(resolve(process.cwd(), 'src/server/brain.js'), 'utf8');

describe('DBB-008/009: brain.js hardware-adaptive model selection', () => {
  it('no hardcoded gemma4:26b model string', () => {
    expect(src).not.toMatch(/['"]gemma4:26b['"]/);
  });

  it('uses config-driven model resolution (not hardcoded)', () => {
    expect(src).toContain('resolveModel');
  });

  it('reads model from config via getConfig', () => {
    expect(src).toContain('getConfig');
  });
});
