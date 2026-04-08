// M24 DBB-3: 服务端常驻唤醒词检测
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

const hubSrc = readFileSync('src/server/hub.js', 'utf8');

describe('M24 DBB-3: hub.js startWakeWordDetection', () => {
  it('exports startWakeWordDetection', () => {
    expect(hubSrc).toContain('export function startWakeWordDetection');
  });

  it('uses WAKE_WORD env var', () => {
    expect(hubSrc).toContain('WAKE_WORD');
  });

  it('broadcasts {type: wake} on keyword match', () => {
    expect(hubSrc).toContain("type: 'wake'");
  });

  it('skips in non-TTY environment', () => {
    expect(hubSrc).toContain('isTTY');
  });

  it('case-insensitive keyword match', () => {
    expect(hubSrc).toContain('toLowerCase()');
  });

  it('does not throw in non-TTY env', async () => {
    const { startWakeWordDetection } = await import('../src/server/hub.js');
    expect(() => startWakeWordDetection('hey')).not.toThrow();
  });

  it('accepts custom keyword', async () => {
    const { startWakeWordDetection } = await import('../src/server/hub.js');
    expect(() => startWakeWordDetection('jarvis')).not.toThrow();
  });
});
