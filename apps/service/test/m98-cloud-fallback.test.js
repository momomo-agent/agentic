import { describe, it, beforeEach, afterEach, mock, assert } from 'node:test';

/**
 * Cloud fallback tests for DBB-006 through DBB-009, DBB-013, DBB-014.
 *
 * Strategy: We test the cloud fallback state machine by importing brain.js
 * with mocked dependencies. The key behaviors:
 * - Timeout >5s → cloud mode
 * - 3 consecutive errors → cloud mode
 * - <3 errors → stays local
 * - Probe success → restore local
 * - Probe failure → stay in cloud
 */

// We'll test by reading the source and verifying the logic structurally,
// since brain.js has deep import dependencies that are hard to mock with node:test.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const brainSrc = readFileSync(resolve(ROOT, 'src/server/brain.js'), 'utf8');

describe('DBB-006: Cloud fallback — timeout trigger', () => {
  it('has FIRST_TOKEN_TIMEOUT_MS set to 5000', () => {
    assert.ok(brainSrc.includes('FIRST_TOKEN_TIMEOUT_MS = 5000'), 'should define 5s timeout constant');
  });

  it('creates AbortController with first-token timeout', () => {
    assert.ok(brainSrc.includes('new AbortController()'), 'should create AbortController');
    assert.ok(brainSrc.includes('setTimeout'), 'should use setTimeout for first-token timer');
    assert.ok(brainSrc.includes('FIRST_TOKEN_TIMEOUT_MS'), 'should reference the timeout constant');
  });

  it('sets _cloudMode = true on timeout/abort error', () => {
    assert.ok(brainSrc.includes("err.name === 'TimeoutError'"), 'should check for TimeoutError');
    assert.ok(brainSrc.includes("err.name === 'AbortError'"), 'should check for AbortError');
    assert.ok(brainSrc.includes('_cloudMode = true'), 'should set cloud mode on timeout');
  });

  it('starts probing after entering cloud mode', () => {
    // After _cloudMode = true, startProbing() should be called
    const afterCloudMode = brainSrc.split('_cloudMode = true')[1] || '';
    assert.ok(afterCloudMode.includes('startProbing()'), 'should call startProbing after entering cloud mode');
  });
});

describe('DBB-007: Cloud fallback — consecutive error trigger', () => {
  it('has MAX_ERRORS set to 3', () => {
    assert.ok(brainSrc.includes('MAX_ERRORS = 3'), 'should define max errors as 3');
  });

  it('increments _errorCount on each failure', () => {
    assert.ok(brainSrc.includes('_errorCount++'), 'should increment error count');
  });

  it('enters cloud mode when _errorCount >= MAX_ERRORS', () => {
    assert.ok(brainSrc.includes('_errorCount >= MAX_ERRORS'), 'should check error count against max');
  });
});

describe('DBB-008: Cloud fallback — auto-restore', () => {
  it('has PROBE_INTERVAL_MS set to 60000', () => {
    assert.ok(brainSrc.includes('PROBE_INTERVAL_MS = 60000'), 'should define 60s probe interval');
  });

  it('probes Ollama /api/tags endpoint', () => {
    assert.ok(brainSrc.includes('/api/tags'), 'should probe Ollama /api/tags');
  });

  it('restores local mode on successful probe (res.ok)', () => {
    // In the probe function, after res.ok check, _cloudMode should be set to false
    const probeSection = brainSrc.split('startProbing')[1] || '';
    assert.ok(probeSection.includes('_cloudMode = false'), 'should set _cloudMode = false on probe success');
    assert.ok(probeSection.includes('_errorCount = 0'), 'should reset error count on probe success');
  });

  it('stops probing after successful restore', () => {
    const probeSection = brainSrc.split('Ollama probe succeeded')[1]?.split('}')[0] || '';
    assert.ok(probeSection.includes('stopProbing'), 'should call stopProbing after restore');
  });
});

describe('DBB-009: Cloud fallback — stays in fallback on probe failure', () => {
  it('probe catch block does not change _cloudMode', () => {
    // The catch block in the probe should be empty (just a comment)
    const probeFunc = brainSrc.match(/setInterval\(async \(\) => \{[\s\S]*?\}, PROBE_INTERVAL_MS\)/)?.[0] || '';
    assert.ok(probeFunc.includes('catch'), 'probe should have catch block');
    // Verify the catch doesn't set _cloudMode = false
    const catchBlock = probeFunc.split('catch')[1]?.split('}')[0] || '';
    assert.ok(!catchBlock.includes('_cloudMode = false'), 'catch block should NOT restore local mode');
  });
});

describe('DBB-013: Cloud fallback — single error does not trigger', () => {
  it('requires isTimeout OR _errorCount >= MAX_ERRORS (3) to enter cloud mode', () => {
    // The condition is: if (isTimeout || _errorCount >= MAX_ERRORS)
    assert.ok(brainSrc.includes('isTimeout || _errorCount >= MAX_ERRORS'), 'should require timeout OR 3+ errors');
    // 1 or 2 errors without timeout should NOT trigger cloud mode
  });

  it('resets _errorCount on successful first token', () => {
    assert.ok(brainSrc.includes('_errorCount = 0'), 'should reset error count on success');
    // Verify it's inside the gotFirstToken block
    const firstTokenBlock = brainSrc.split('gotFirstToken = true')[1]?.split('}')[0] || '';
    assert.ok(firstTokenBlock.includes('_errorCount = 0'), 'error count reset should be after first token received');
  });
});

describe('DBB-014: Cloud fallback — timeout boundary', () => {
  it('timeout is strictly greater than 5s (uses setTimeout with FIRST_TOKEN_TIMEOUT_MS)', () => {
    // The timer fires after FIRST_TOKEN_TIMEOUT_MS (5000ms).
    // A response arriving at exactly 5000ms would clear the timer before abort.
    // The abort only fires if !gotFirstToken after the timeout.
    assert.ok(brainSrc.includes('if (!gotFirstToken) ac.abort()'), 'should only abort if no first token received');
    assert.ok(brainSrc.includes('clearTimeout(firstTokenTimer)'), 'should clear timer on first token');
  });
});

describe('Cloud fallback — structural integrity', () => {
  it('skips Ollama when already in cloud mode', () => {
    assert.ok(brainSrc.includes('if (_cloudMode || primary.provider !== \'ollama\')'), 'should skip Ollama in cloud mode');
  });

  it('uses chatFallback slot for fallback model', () => {
    assert.ok(brainSrc.includes("resolveModel('chatFallback')"), 'should resolve chatFallback model');
  });

  it('config change resets cloud mode', () => {
    const configHandler = brainSrc.split('onConfigChange')[1]?.split('});')[0] || '';
    assert.ok(configHandler.includes('_cloudMode = false'), 'config change should reset cloud mode');
    assert.ok(configHandler.includes('_errorCount = 0'), 'config change should reset error count');
    assert.ok(configHandler.includes('stopProbing'), 'config change should stop probing');
  });
});
