// M24/M25 DBB: Ollama自动安装
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

const src = readFileSync('src/cli/setup.js', 'utf8');

describe('M25 DBB: Ollama auto-install in setup.js', () => {
  it('exports isOllamaInstalled helper', () => {
    expect(src).toContain('isOllamaInstalled');
  });

  it('exports isModelPulled helper', () => {
    expect(src).toContain('isModelPulled');
  });

  it('getInstallCommand handles darwin', () => {
    expect(src).toContain("'darwin'");
    expect(src).toContain('brew install ollama');
  });

  it('getInstallCommand handles linux', () => {
    expect(src).toContain("'linux'");
    expect(src).toContain('ollama.ai/install.sh');
  });

  it('throws on unsupported platform', () => {
    expect(src).toContain('unsupported platform');
  });

  it('runSetup calls installOllama when not installed', () => {
    expect(src).toContain('installOllama');
  });

  it('runSetup calls pullModel when model missing', () => {
    expect(src).toContain('pullModel');
  });

  it('skips pull when model already present', () => {
    expect(src).toContain('already present');
  });
});
