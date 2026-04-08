import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
const senseSource = readFileSync(resolve(process.cwd(), 'src/runtime/sense.js'), 'utf8');
const sttSource = readFileSync(resolve(process.cwd(), 'src/runtime/stt.js'), 'utf8');
const ttsSource = readFileSync(resolve(process.cwd(), 'src/runtime/tts.js'), 'utf8');

describe('agentic-sense and agentic-voice package wiring', () => {
  it('sense.js imports from agentic-sense', () => {
    expect(senseSource).toMatch(/from ['"]agentic-sense['"]/);
  });

  it('stt.js imports from agentic-voice', () => {
    expect(sttSource).toMatch(/agentic-voice/);
  });

  it('tts.js imports from agentic-voice', () => {
    expect(ttsSource).toMatch(/agentic-voice/);
  });

  it('package.json imports map has agentic-sense entry', () => {
    // M84 supersedes M77: agentic-sense is a direct dependency, not in imports map
    const hasDep = pkg.dependencies && 'agentic-sense' in pkg.dependencies;
    const hasImport = Object.keys(pkg.imports || {}).some(k => k.includes('agentic-sense'));
    expect(hasDep || hasImport, 'agentic-sense missing from imports map').toBe(true);
  });

  it('package.json imports map has agentic-voice entries', () => {
    const imports = pkg.imports || {};
    const hasAgenticVoice = Object.keys(imports).some(k => k.includes('agentic-voice'));
    expect(hasAgenticVoice, 'agentic-voice missing from imports map').toBe(true);
  });
});
