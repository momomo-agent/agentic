import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const brainSrc = readFileSync(resolve(ROOT, 'src/server/brain.js'), 'utf8');

describe('DBB-006: Cloud fallback — timeout trigger', () => {
  it('has FIRST_TOKEN_TIMEOUT_MS set to 5000', () => {
    expect(brainSrc.includes('FIRST_TOKEN_TIMEOUT_MS = 5000')).toBeTruthy();
  });

  it('creates AbortController with first-token timeout', () => {
    expect(brainSrc.includes('new AbortController()')).toBeTruthy();
    expect(brainSrc.includes('setTimeout')).toBeTruthy();
    expect(brainSrc.includes('FIRST_TOKEN_TIMEOUT_MS')).toBeTruthy();
  });

  it('sets _cloudMode = true on timeout/abort error', () => {
    expect(brainSrc.includes("err.name === 'TimeoutError'")).toBeTruthy();
    expect(brainSrc.includes("err.name === 'AbortError'")).toBeTruthy();
    expect(brainSrc.includes('_cloudMode = true')).toBeTruthy();
  });

  it('starts probing after entering cloud mode', () => {
    const afterCloudMode = brainSrc.split('_cloudMode = true')[1] || '';
    expect(afterCloudMode.includes('startProbing()')).toBeTruthy();
  });
});

describe('DBB-007: Cloud fallback — consecutive error trigger', () => {
  it('has MAX_ERRORS set to 3', () => {
    expect(brainSrc.includes('MAX_ERRORS = 3')).toBeTruthy();
  });

  it('increments _errorCount on each failure', () => {
    expect(brainSrc.includes('_errorCount++')).toBeTruthy();
  });

  it('enters cloud mode when _errorCount >= MAX_ERRORS', () => {
    expect(brainSrc.includes('_errorCount >= MAX_ERRORS')).toBeTruthy();
  });
});

describe('DBB-008: Cloud fallback — auto-restore', () => {
  it('has PROBE_INTERVAL_MS set to 60000', () => {
    expect(brainSrc.includes('PROBE_INTERVAL_MS = 60000')).toBeTruthy();
  });

  it('probes Ollama /api/tags endpoint', () => {
    expect(brainSrc.includes('/api/tags')).toBeTruthy();
  });

  it('restores local mode on successful probe', () => {
    const probeSection = brainSrc.split('startProbing')[1] || '';
    expect(probeSection.includes('_cloudMode = false')).toBeTruthy();
    expect(probeSection.includes('_errorCount = 0')).toBeTruthy();
  });

  it('stops probing after successful restore', () => {
    const probeSection = brainSrc.split('Ollama probe succeeded')[1]?.split('}')[0] || '';
    expect(probeSection.includes('stopProbing')).toBeTruthy();
  });
});

describe('DBB-009: Cloud fallback — stays in fallback on probe failure', () => {
  it('probe catch block does not restore local mode', () => {
    const probeFunc = brainSrc.match(/setInterval\(async \(\) => \{[\s\S]*?\}, PROBE_INTERVAL_MS\)/)?.[0] || '';
    expect(probeFunc.includes('catch')).toBeTruthy();
    const catchBlock = probeFunc.split('catch')[1]?.split('}')[0] || '';
    expect(catchBlock.includes('_cloudMode = false')).toBeFalsy();
  });
});

describe('DBB-013: Cloud fallback — single error does not trigger', () => {
  it('requires isTimeout OR _errorCount >= MAX_ERRORS to enter cloud mode', () => {
    expect(brainSrc.includes('isTimeout || _errorCount >= MAX_ERRORS')).toBeTruthy();
  });

  it('resets _errorCount on successful first token', () => {
    const firstTokenBlock = brainSrc.split('gotFirstToken = true')[1]?.split('}')[0] || '';
    expect(firstTokenBlock.includes('_errorCount = 0')).toBeTruthy();
  });
});

describe('DBB-014: Cloud fallback — timeout boundary', () => {
  it('only aborts if no first token received', () => {
    expect(brainSrc.includes('if (!gotFirstToken) ac.abort()')).toBeTruthy();
  });

  it('clears timer on first token (exact 5s response completes)', () => {
    expect(brainSrc.includes('clearTimeout(firstTokenTimer)')).toBeTruthy();
  });
});

describe('Cloud fallback — structural integrity', () => {
  it('skips Ollama when already in cloud mode', () => {
    expect(brainSrc.includes('_cloudMode')).toBeTruthy();
  });

  it('uses chatFallback slot for fallback model', () => {
    expect(brainSrc.includes("resolveModel('chatFallback')")).toBeTruthy();
  });

  it('config change resets cloud mode', () => {
    // Match the onConfigChange callback body (the one with arrow function, not the import)
    const callbackMatch = brainSrc.match(/onConfigChange\(\s*\w+\s*=>\s*\{([\s\S]*?)\}\)/);
    const callbackBody = callbackMatch ? callbackMatch[1] : '';
    expect(callbackBody.includes('_cloudMode = false')).toBeTruthy();
    expect(callbackBody.includes('_errorCount = 0')).toBeTruthy();
    expect(callbackBody.includes('stopProbing')).toBeTruthy();
  });
});
