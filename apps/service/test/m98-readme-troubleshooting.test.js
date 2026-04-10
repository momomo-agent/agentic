import { describe, it, assert } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const readme = readFileSync(resolve(ROOT, 'README.md'), 'utf8');

describe('DBB-010: README troubleshooting section', () => {
  it('has a Troubleshooting heading', () => {
    assert.ok(/^##\s+Troubleshooting/m.test(readme), 'README should have a ## Troubleshooting heading');
  });

  it('covers Ollama not starting', () => {
    assert.ok(/ollama.*not.*start|ollama.*serve/i.test(readme), 'should cover Ollama startup issues');
  });

  it('covers port conflicts (EADDRINUSE)', () => {
    assert.ok(/port.*already.*in.*use|EADDRINUSE/i.test(readme), 'should cover port conflict issues');
  });

  it('covers model download issues', () => {
    assert.ok(/model.*download|download.*stuck/i.test(readme), 'should cover model download issues');
  });

  it('covers Docker Ollama connectivity', () => {
    assert.ok(/docker.*ollama|OLLAMA_HOST/i.test(readme), 'should cover Docker-Ollama connectivity');
  });

  it('covers out of memory / model too large', () => {
    assert.ok(/out.*of.*memory|model.*too.*large|memory/i.test(readme), 'should cover memory issues');
  });

  it('port references use 1234 (not 3000) in troubleshooting section', () => {
    const troubleSection = readme.split(/^##\s+Troubleshooting/m)[1] || '';
    if (troubleSection.includes('1234')) {
      assert.ok(!troubleSection.includes('3000'), 'troubleshooting section should not reference port 3000');
    }
  });
});
