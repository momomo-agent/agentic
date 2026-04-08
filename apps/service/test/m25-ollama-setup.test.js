// M25 DBB: Ollama自动安装
import { readFileSync } from 'fs';
import { describe, it, expect } from 'vitest';

const src = readFileSync('src/cli/setup.js', 'utf8');

describe('M25 DBB: isOllamaInstalled uses which', () => {
  it('calls which ollama', () => {
    expect(src).toContain('which ollama');
  });
});

describe('M25 DBB: getInstallCommand platform support', () => {
  it('darwin uses brew install ollama', () => {
    expect(src).toContain('brew install ollama');
  });

  it('linux uses curl install script', () => {
    expect(src).toContain('https://ollama.ai/install.sh');
  });

  it('unsupported platform throws', () => {
    expect(src).toContain('unsupported platform for auto-install');
  });
});

describe('M25 DBB: runSetup Ollama block', () => {
  it('checks isOllamaInstalled before installing', () => {
    expect(src).toContain('isOllamaInstalled');
    expect(src).toContain('installOllama');
  });

  it('checks isModelPulled before pulling', () => {
    expect(src).toContain('isModelPulled');
    expect(src).toContain('pullModel');
  });

  it('shows already present message when model exists', () => {
    expect(src).toContain('already present');
  });

  it('only runs ollama block when provider is ollama', () => {
    expect(src).toContain("provider === 'ollama'");
  });
});

describe('M25 DBB: pullModel shows spinner progress', () => {
  it('uses ora spinner for pull', () => {
    expect(src).toContain('Pulling model');
  });

  it('succeeds spinner on completion', () => {
    expect(src).toContain('spinner.succeed');
  });
});
