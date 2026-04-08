import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readme = readFileSync(path.join(__dirname, '../README.md'), 'utf-8');

describe('M29 DBB: README completeness', () => {
  it('has installation section', () => {
    expect(readme.includes('npx') || readme.includes('npm i -g')).toBe(true);
  });
  it('has Quick Start section', () => { expect(readme).toContain('Quick Start'); });
  it('documents /api/chat', () => { expect(readme).toContain('/api/chat'); });
  it('documents /api/transcribe', () => { expect(readme).toContain('/api/transcribe'); });
  it('documents /api/synthesize', () => { expect(readme).toContain('/api/synthesize'); });
  it('documents /api/status', () => { expect(readme).toContain('/api/status'); });
  it('documents /api/config', () => { expect(readme).toContain('/api/config'); });
  it('has Docker section', () => { expect(readme.toLowerCase()).toContain('docker'); });
  it('has configuration section', () => {
    expect(readme.includes('PROFILES_URL') || readme.includes('profile')).toBe(true);
  });
  it('has troubleshooting section', () => {
    expect(readme.includes('Ollama') || readme.includes('port in use') || readme.includes('Troubleshoot')).toBe(true);
  });
});
