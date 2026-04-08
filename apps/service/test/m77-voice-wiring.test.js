import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

const stt = readFileSync('src/runtime/stt.js', 'utf8');
const tts = readFileSync('src/runtime/tts.js', 'utf8');

describe('agentic-voice wrapping (m77)', () => {
  it('stt.js imports from agentic-voice', () => {
    expect(stt).toMatch(/agentic-voice/);
  });

  it('stt.js exports transcribe', () => {
    expect(stt).toContain('export async function transcribe');
  });

  it('tts.js imports from agentic-voice', () => {
    expect(tts).toMatch(/agentic-voice/);
  });

  it('tts.js exports synthesize', () => {
    expect(tts).toContain('export async function synthesize');
  });
});
