import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'profiles/default.json'), 'utf8'));

describe('profiles/default.json cpu-only profile', () => {
  it('has a cpu-only profile entry', () => {
    const cpuProfile = data.profiles.find(p =>
      p.match?.gpu === 'none' || p.config?.llm?.model?.includes('2b')
    );
    expect(cpuProfile).toBeDefined();
  });

  it('cpu-only profile uses gemma2:2b model', () => {
    const cpuProfile = data.profiles.find(p =>
      p.match?.gpu === 'none' || p.config?.llm?.model?.includes('2b')
    );
    expect(cpuProfile.config.llm.model).toContain('2b');
  });

  it('cpu-only profile has quantization q4', () => {
    const cpuProfile = data.profiles.find(p =>
      p.match?.gpu === 'none' || p.config?.llm?.model?.includes('2b')
    );
    expect(cpuProfile.config.llm.quantization).toBe('q4');
  });

  it('has apple-silicon, nvidia, and cpu-only profiles', () => {
    const gpuTypes = data.profiles.map(p => p.match?.gpu || p.match?.arch);
    expect(gpuTypes).toContain('apple-silicon');
    expect(gpuTypes).toContain('nvidia');
    // cpu-only has gpu: 'none'
    const cpuOnly = data.profiles.find(p => p.match?.gpu === 'none');
    expect(cpuOnly).toBeDefined();
  });
});
