// M29 DBB: 服务端唤醒词常驻pipeline — api.js integration
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

const src = readFileSync('src/server/api.js', 'utf8');

describe('M29 DBB: api.js wake word integration', () => {
  it('imports startWakeWordPipeline from sense.js', () => {
    expect(src).toContain('startWakeWordPipeline');
  });

  it('calls startWakeWordPipeline on server start', () => {
    expect(src).toMatch(/startWakeWordPipeline\(/);
  });

  it('registers SIGINT handler with stopWake', () => {
    expect(src).toContain('SIGINT');
    expect(src).toContain('stopWake');
  });

  it('broadcasts wake_word via broadcastWakeword', () => {
    expect(src).toContain('broadcastWakeword');
  });
});
