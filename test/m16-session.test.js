import { describe, it, expect, beforeEach } from 'vitest';
import { joinSession, setSessionData, getSessionData, broadcastSession } from '../src/server/hub.js';

describe('multi-device session sharing', () => {
  it('joinSession creates session and adds deviceId', () => {
    joinSession('s1', 'dev-a');
    expect(getSessionData('s1', 'x')).toBeNull();
  });

  it('setSessionData and getSessionData share across devices', () => {
    joinSession('s2', 'dev-a');
    joinSession('s2', 'dev-b');
    setSessionData('s2', 'foo', 'bar');
    expect(getSessionData('s2', 'foo')).toBe('bar');
  });

  it('getSessionData returns null for unknown key', () => {
    expect(getSessionData('unknown', 'key')).toBeNull();
  });

  it('broadcastSession does not throw with no connected devices', () => {
    expect(() => broadcastSession('s3')).not.toThrow();
  });
});
