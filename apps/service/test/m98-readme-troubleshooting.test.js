import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const readme = readFileSync(resolve(ROOT, 'README.md'), 'utf8');

describe('DBB-010: README troubleshooting section', () => {
  it('has a Troubleshooting heading', () => {
    expect(/^##\s+Troubleshooting/m.test(readme)).toBeTruthy();
  });

  it('covers Ollama not starting', () => {
    expect(/ollama.*not.*start|ollama.*serve/i.test(readme)).toBeTruthy();
  });

  it('covers port conflicts (EADDRINUSE)', () => {
    expect(/port.*already.*in.*use|EADDRINUSE/i.test(readme)).toBeTruthy();
  });

  it('covers model download issues', () => {
    expect(/model.*download|download.*stuck/i.test(readme)).toBeTruthy();
  });

  it('covers Docker Ollama connectivity', () => {
    expect(/docker.*ollama|OLLAMA_HOST/i.test(readme)).toBeTruthy();
  });

  it('covers out of memory / model too large', () => {
    expect(/out.*of.*memory|model.*too.*large|memory/i.test(readme)).toBeTruthy();
  });

  it('port references use 1234 in troubleshooting section', () => {
    const troubleSection = readme.split(/^##\s+Troubleshooting/m)[1] || '';
    if (troubleSection.includes('1234')) {
      expect(troubleSection.includes('3000')).toBeFalsy();
    }
  });
});
