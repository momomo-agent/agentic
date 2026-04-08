import { describe, it, expect, vi } from 'vitest';
import { joinSession, setSessionData, getSessionData, broadcastSession, registerDevice, unregisterDevice } from '../src/server/hub.js';

describe('DBB-004: multi-device brain state sharing', () => {
  it('broadcastSession sends data to all registered devices', () => {
    const sent = [];
    const ws1 = { send: (msg) => sent.push({ dev: 'dev-1', msg: JSON.parse(msg) }) };
    const ws2 = { send: (msg) => sent.push({ dev: 'dev-2', msg: JSON.parse(msg) }) };

    registerDevice({ id: 'dev-1', name: 'Device 1', capabilities: [], ws: ws1, lastPong: Date.now() });
    registerDevice({ id: 'dev-2', name: 'Device 2', capabilities: [], ws: ws2, lastPong: Date.now() });

    joinSession('sess-broadcast', 'dev-1');
    joinSession('sess-broadcast', 'dev-2');
    setSessionData('sess-broadcast', 'history', [{ role: 'user', content: 'hello' }]);
    broadcastSession('sess-broadcast');

    const msgs = sent.filter(s => s.msg.sessionId === 'sess-broadcast');
    expect(msgs.length).toBe(2);
    expect(msgs[0].msg.type).toBe('session');
    expect(msgs[0].msg.data.history).toEqual([{ role: 'user', content: 'hello' }]);

    unregisterDevice('dev-1');
    unregisterDevice('dev-2');
  });

  it('broadcastSession truncates history to last 20 messages', () => {
    const received = [];
    const ws = { send: (msg) => received.push(JSON.parse(msg)) };
    registerDevice({ id: 'dev-trunc', name: 'T', capabilities: [], ws, lastPong: Date.now() });
    joinSession('sess-trunc', 'dev-trunc');

    const longHistory = Array.from({ length: 25 }, (_, i) => ({ role: 'user', content: `msg${i}` }));
    setSessionData('sess-trunc', 'history', longHistory);
    broadcastSession('sess-trunc');

    const msg = received.find(m => m.sessionId === 'sess-trunc');
    expect(msg.data.history.length).toBe(20);
    expect(msg.data.history[0].content).toBe('msg5');

    unregisterDevice('dev-trunc');
  });

  it('broadcastSession silently skips unknown sessionId', () => {
    expect(() => broadcastSession('nonexistent-session')).not.toThrow();
  });

  it('disconnected device removed from registry on send error', () => {
    const ws = { send: () => { throw new Error('disconnected'); } };
    registerDevice({ id: 'dev-broken', name: 'B', capabilities: [], ws, lastPong: Date.now() });
    setSessionData('sess-err', 'history', []);
    expect(() => broadcastSession('sess-err')).not.toThrow();
  });

  it('session data persists across multiple setSessionData calls', () => {
    setSessionData('sess-persist', 'history', ['turn1']);
    setSessionData('sess-persist', 'profile', 'default');
    expect(getSessionData('sess-persist', 'history')).toEqual(['turn1']);
    expect(getSessionData('sess-persist', 'profile')).toBe('default');
  });
});
